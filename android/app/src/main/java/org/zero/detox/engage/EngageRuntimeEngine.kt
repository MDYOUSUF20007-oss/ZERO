package org.zero.detox.engage

import org.zero.detox.data.BagStore
import java.util.ArrayDeque

/**
 * EngageRuntimeEngine:
 * Pure deterministic Kotlin state machine driving Phase 2 per-app enforcement:
 * - Cumulative per-Bag quotas -> dynamic switch to hard_block on depletion
 * - Continuous session limit -> mandatory cooldown lockouts
 * - Mindful friction wait + optional intent verification + re-entry grace period
 * - Transient window immunity (IME keyboards, SystemUI, launchers)
 * - 400ms debounced view tree inspection gate
 * - 10-second sliding ring buffer for Scroll Velocity interventions
 * - Periodic in-app nudge interval milestones
 *
 * Strictly zero Android View/Window dependencies so full logic runs inside fast JVM JUnit tests.
 */
class EngageRuntimeEngine(
    private val ownPackageName: String = "org.zero.detox"
) {

    enum class TickAction {
        NONE,
        ALLOW,
        REQUIRE_FRICTION,
        BLOCK_QUOTA,
        BLOCK_COOLDOWN,
        BLOCK_HARD
    }

    data class TickDecision(
        val action: TickAction,
        val packageName: String,
        val rule: EngageConfig.AppRuleConfig? = null,
        val remainingQuotaSeconds: Long = -1L,
        val continuousSeconds: Long = 0L,
        val cooldownRemainingSeconds: Long = 0L
    )

    data class NudgeDecision(
        val packageName: String,
        val continuousSeconds: Long,
        val remainingQuotaSeconds: Long
    )

    private data class AppRuntimeState(
        val packageName: String,
        var remainingQuotaMs: Long?,
        var quotaExhausted: Boolean = false,
        var continuousSessionMs: Long = 0L,
        var cooldownUntilElapsedMs: Long = 0L,
        var frictionPassedForCurrentVisit: Boolean = false,
        var hasCompletedFrictionBefore: Boolean = false,
        var lastLeftElapsedMs: Long = -1L,
        var lastTickElapsedMs: Long = -1L,
        var nextNudgeAtContinuousMs: Long = Long.MAX_VALUE,
        val scrollTimestampsMs: ArrayDeque<Long> = ArrayDeque()
    )

    private var config: EngageConfig.SessionPayloadConfig? = null
    private var configRevision: Long = -1L
    private val appStates = HashMap<String, AppRuntimeState>()
    private var activeControlledPackage: String? = null
    private var lastContentInspectElapsedMs: Long = -10_000L

    @Synchronized
    fun configure(nextConfig: EngageConfig.SessionPayloadConfig?, revision: Long) {
        if (nextConfig == null) {
            reset()
            return
        }
        if (configRevision == revision && config?.rawJson == nextConfig.rawJson) {
            return
        }
        config = nextConfig
        configRevision = revision
        appStates.clear()
        activeControlledPackage = null
        lastContentInspectElapsedMs = -10_000L
    }

    @Synchronized
    fun reset() {
        config = null
        configRevision = -1L
        appStates.clear()
        activeControlledPackage = null
        lastContentInspectElapsedMs = -10_000L
    }

    @Synchronized
    fun getConfig(): EngageConfig.SessionPayloadConfig? = config

    @Synchronized
    fun getRuleForPackage(pkg: String): EngageConfig.AppRuleConfig? = config?.appConfigs?.get(pkg)

    @Synchronized
    fun shouldInspectWindowContent(nowElapsedMs: Long): Boolean {
        if (nowElapsedMs - lastContentInspectElapsedMs < 400L) {
            return false
        }
        lastContentInspectElapsedMs = nowElapsedMs
        return true
    }

    private fun getOrCreateState(pkg: String, rule: EngageConfig.AppRuleConfig): AppRuntimeState {
        return appStates.getOrPut(pkg) {
            AppRuntimeState(
                packageName = pkg,
                remainingQuotaMs = if (rule.quotaSeconds > 0L) rule.quotaSeconds * 1000L else null,
                nextNudgeAtContinuousMs = if (rule.nudgeIntervalSeconds > 0L) {
                    rule.nudgeIntervalSeconds * 1000L
                } else {
                    Long.MAX_VALUE
                }
            )
        }
    }

    private fun recordDepartureFromActiveControlled(nowElapsedMs: Long) {
        val prevPkg = activeControlledPackage ?: return
        val prevState = appStates[prevPkg]
        if (prevState != null) {
            prevState.lastLeftElapsedMs = nowElapsedMs
            prevState.lastTickElapsedMs = -1L
            prevState.continuousSessionMs = 0L
            prevState.frictionPassedForCurrentVisit = false
            val prevRule = config?.appConfigs?.get(prevPkg)
            prevState.nextNudgeAtContinuousMs = if (prevRule != null && prevRule.nudgeIntervalSeconds > 0L) {
                prevRule.nudgeIntervalSeconds * 1000L
            } else {
                Long.MAX_VALUE
            }
        }
        activeControlledPackage = null
    }

    @JvmOverloads
    @Synchronized
    fun onForegroundTick(
        foregroundPkg: String,
        nowElapsedMs: Long,
        imePackages: Set<String> = emptySet(),
        launcherPackages: Set<String> = emptySet(),
        legacyBagAllowed: (String) -> Boolean = { false }
    ): TickDecision {
        val cfg = config ?: return TickDecision(TickAction.NONE, foregroundPkg)

        if (foregroundPkg.isBlank()) {
            return TickDecision(TickAction.NONE, foregroundPkg)
        }

        // Ignore SystemUI and Launchers in session timer evaluation so notifications,
        // volume panels, or brief Home transitions never corrupt controlled session timers
        // or falsely reset friction state.
        if (foregroundPkg == "com.android.systemui" || launcherPackages.contains(foregroundPkg)) {
            return TickDecision(TickAction.NONE, foregroundPkg)
        }

        // If the foreground window is an InputMethod (keyboard), attribute usage to the
        // currently focused controlled app so typing inside it keeps continuous time smooth
        // and never triggers false re-entry friction.
        val resolvedPkg = if (imePackages.contains(foregroundPkg)) {
            activeControlledPackage ?: return TickDecision(TickAction.NONE, foregroundPkg)
        } else {
            foregroundPkg
        }

        if (resolvedPkg == ownPackageName) {
            recordDepartureFromActiveControlled(nowElapsedMs)
            return TickDecision(TickAction.ALLOW, resolvedPkg)
        }

        if (BagStore.PROTECTED_SYSTEM_PACKAGES.contains(resolvedPkg)) {
            recordDepartureFromActiveControlled(nowElapsedMs)
            return TickDecision(TickAction.BLOCK_HARD, resolvedPkg)
        }

        if (cfg.compulsoryPackages.contains(resolvedPkg)) {
            recordDepartureFromActiveControlled(nowElapsedMs)
            return TickDecision(
                TickAction.ALLOW,
                resolvedPkg,
                EngageConfig.AppRuleConfig(mode = EngageConfig.AccessMode.UNRESTRICTED)
            )
        }

        val rule = cfg.appConfigs[resolvedPkg]
        if (rule == null) {
            recordDepartureFromActiveControlled(nowElapsedMs)
            return if (legacyBagAllowed(resolvedPkg)) {
                TickDecision(
                    TickAction.ALLOW,
                    resolvedPkg,
                    EngageConfig.AppRuleConfig(mode = EngageConfig.AccessMode.UNRESTRICTED)
                )
            } else {
                TickDecision(TickAction.BLOCK_HARD, resolvedPkg)
            }
        }

        when (rule.mode) {
            EngageConfig.AccessMode.HARD_BLOCK -> {
                recordDepartureFromActiveControlled(nowElapsedMs)
                return TickDecision(TickAction.BLOCK_HARD, resolvedPkg, rule)
            }
            EngageConfig.AccessMode.UNRESTRICTED -> {
                recordDepartureFromActiveControlled(nowElapsedMs)
                return TickDecision(TickAction.ALLOW, resolvedPkg, rule)
            }
            EngageConfig.AccessMode.CONTROLLED -> Unit
        }

        if (activeControlledPackage != null && activeControlledPackage != resolvedPkg) {
            recordDepartureFromActiveControlled(nowElapsedMs)
        }

        val state = getOrCreateState(resolvedPkg, rule)

        // 1. Check total quota depletion (dynamically permanently hard-blocked for Bag session)
        if (state.quotaExhausted ||
            (rule.quotaSeconds > 0L && (state.remainingQuotaMs ?: 0L) <= 0L)
        ) {
            state.quotaExhausted = true
            state.continuousSessionMs = 0L
            state.lastTickElapsedMs = -1L
            activeControlledPackage = null
            return TickDecision(
                action = TickAction.BLOCK_QUOTA,
                packageName = resolvedPkg,
                rule = rule,
                remainingQuotaSeconds = 0L
            )
        }

        // 2. Check active cooldown lock
        if (state.cooldownUntilElapsedMs > nowElapsedMs) {
            val remSec = ((state.cooldownUntilElapsedMs - nowElapsedMs + 999L) / 1000L)
                .coerceAtLeast(1L)
            state.continuousSessionMs = 0L
            state.lastTickElapsedMs = -1L
            activeControlledPackage = null
            return TickDecision(
                action = TickAction.BLOCK_COOLDOWN,
                packageName = resolvedPkg,
                rule = rule,
                remainingQuotaSeconds = (state.remainingQuotaMs ?: -1L).let { if (it >= 0L) it / 1000L else -1L },
                continuousSeconds = 0L,
                cooldownRemainingSeconds = remSec
            )
        }

        // 3. Check Mindful Friction gate BEFORE counting usage seconds
        if (rule.frictionEnabled && !state.frictionPassedForCurrentVisit) {
            val graceMs = rule.reEntryGraceSeconds.toLong() * 1000L
            val withinGrace = state.hasCompletedFrictionBefore &&
                graceMs > 0L &&
                state.lastLeftElapsedMs >= 0L &&
                (nowElapsedMs - state.lastLeftElapsedMs) <= graceMs

            if (withinGrace) {
                state.frictionPassedForCurrentVisit = true
            } else {
                state.lastTickElapsedMs = -1L
                return TickDecision(
                    action = TickAction.REQUIRE_FRICTION,
                    packageName = resolvedPkg,
                    rule = rule,
                    remainingQuotaSeconds = (state.remainingQuotaMs ?: -1L).let { if (it >= 0L) it / 1000L else -1L },
                    continuousSeconds = state.continuousSessionMs / 1000L
                )
            }
        }

        // 4. Allowed in controlled mode -> advance elapsed foreground delta
        val isFreshFocus = activeControlledPackage != resolvedPkg || state.lastTickElapsedMs < 0L
        activeControlledPackage = resolvedPkg

        val deltaMs = if (isFreshFocus) {
            0L
        } else {
            (nowElapsedMs - state.lastTickElapsedMs).coerceIn(0L, 5000L)
        }
        state.lastTickElapsedMs = nowElapsedMs

        if (rule.quotaSeconds > 0L && state.remainingQuotaMs != null) {
            val nextRem = maxOf(0L, state.remainingQuotaMs!! - deltaMs)
            state.remainingQuotaMs = nextRem
            if (nextRem <= 0L) {
                state.quotaExhausted = true
                state.continuousSessionMs = 0L
                state.lastTickElapsedMs = -1L
                activeControlledPackage = null
                return TickDecision(
                    action = TickAction.BLOCK_QUOTA,
                    packageName = resolvedPkg,
                    rule = rule,
                    remainingQuotaSeconds = 0L
                )
            }
        }

        state.continuousSessionMs += deltaMs

        // 5. Check continuous session limit -> force cooldown break
        if (rule.maxContinuousSeconds > 0L &&
            state.continuousSessionMs >= rule.maxContinuousSeconds * 1000L
        ) {
            state.continuousSessionMs = 0L
            state.lastTickElapsedMs = -1L
            state.frictionPassedForCurrentVisit = false
            state.hasCompletedFrictionBefore = false
            state.nextNudgeAtContinuousMs = if (rule.nudgeIntervalSeconds > 0L) {
                rule.nudgeIntervalSeconds * 1000L
            } else {
                Long.MAX_VALUE
            }
            activeControlledPackage = null

            val remQuotaSec = (state.remainingQuotaMs ?: -1L).let { if (it >= 0L) it / 1000L else -1L }
            return if (rule.cooldownSeconds > 0L) {
                state.cooldownUntilElapsedMs = nowElapsedMs + rule.cooldownSeconds * 1000L
                TickDecision(
                    action = TickAction.BLOCK_COOLDOWN,
                    packageName = resolvedPkg,
                    rule = rule,
                    remainingQuotaSeconds = remQuotaSec,
                    continuousSeconds = 0L,
                    cooldownRemainingSeconds = rule.cooldownSeconds
                )
            } else {
                TickDecision(
                    action = if (rule.frictionEnabled) TickAction.REQUIRE_FRICTION else TickAction.ALLOW,
                    packageName = resolvedPkg,
                    rule = rule,
                    remainingQuotaSeconds = remQuotaSec
                )
            }
        }

        val remQuotaSec = (state.remainingQuotaMs ?: -1L).let { if (it >= 0L) it / 1000L else -1L }
        return TickDecision(
            action = TickAction.ALLOW,
            packageName = resolvedPkg,
            rule = rule,
            remainingQuotaSeconds = remQuotaSec,
            continuousSeconds = state.continuousSessionMs / 1000L
        )
    }

    @Synchronized
    fun markFrictionPassed(pkg: String, nowElapsedMs: Long) {
        val rule = config?.appConfigs?.get(pkg) ?: return
        val state = getOrCreateState(pkg, rule)
        state.frictionPassedForCurrentVisit = true
        state.hasCompletedFrictionBefore = true
        state.lastLeftElapsedMs = -1L
        state.lastTickElapsedMs = nowElapsedMs
        activeControlledPackage = pkg
    }

    @Synchronized
    fun consumePendingNudge(pkg: String): NudgeDecision? {
        val rule = config?.appConfigs?.get(pkg) ?: return null
        if (rule.mode != EngageConfig.AccessMode.CONTROLLED || rule.nudgeIntervalSeconds <= 0L) {
            return null
        }
        val state = appStates[pkg] ?: return null
        val intervalMs = rule.nudgeIntervalSeconds * 1000L
        if (state.continuousSessionMs < state.nextNudgeAtContinuousMs) {
            return null
        }
        while (state.continuousSessionMs >= state.nextNudgeAtContinuousMs) {
            state.nextNudgeAtContinuousMs += intervalMs
        }
        val remQuotaSec = (state.remainingQuotaMs ?: -1L).let { if (it >= 0L) it / 1000L else -1L }
        return NudgeDecision(
            packageName = pkg,
            continuousSeconds = state.continuousSessionMs / 1000L,
            remainingQuotaSeconds = remQuotaSec
        )
    }

    /**
     * Records a scroll event inside a 10-second sliding ring buffer.
     * Returns true when event count in the trailing 10s strictly exceeds scrollVelocityLimit.
     */
    @Synchronized
    fun onScrollEvent(pkg: String, nowElapsedMs: Long): Boolean {
        val rule = config?.appConfigs?.get(pkg) ?: return false
        if (rule.mode != EngageConfig.AccessMode.CONTROLLED || rule.scrollVelocityLimit <= 0) {
            return false
        }
        val state = getOrCreateState(pkg, rule)
        val windowStart = nowElapsedMs - 10_000L
        while (state.scrollTimestampsMs.isNotEmpty() &&
            state.scrollTimestampsMs.first() < windowStart
        ) {
            state.scrollTimestampsMs.removeFirst()
        }
        state.scrollTimestampsMs.addLast(nowElapsedMs)
        return state.scrollTimestampsMs.size > rule.scrollVelocityLimit
    }

    @Synchronized
    fun clearScrollBuffer(pkg: String) {
        appStates[pkg]?.scrollTimestampsMs?.clear()
    }
}
