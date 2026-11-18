package org.zero.detox.plugin

import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * ZeroTubeDownloader:
 * Clean OkHttp 4.12 Downloader implementation for NewPipeExtractor (v0.27.1).
 * Uses a standard desktop Firefox User-Agent and strict 15-second timeouts with zero telemetry.
 */
class ZeroTubeDownloader private constructor() : Downloader() {

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    @Throws(IOException::class, ReCaptchaException::class)
    override fun execute(request: Request): Response {
        val httpMethod = request.httpMethod()
        val url = request.url()
        val headers = request.headers()
        val dataToSend = request.dataToSend()

        val requestBody = when {
            dataToSend != null -> dataToSend.toRequestBody(null)
            httpMethod.equals("POST", ignoreCase = true) ||
                httpMethod.equals("PUT", ignoreCase = true) -> ByteArray(0).toRequestBody(null)
            else -> null
        }

        val requestBuilder = okhttp3.Request.Builder()
            .method(httpMethod, requestBody)
            .url(url)
            .header("User-Agent", USER_AGENT)

        for ((headerName, headerValues) in headers) {
            if (headerValues.size > 1) {
                requestBuilder.removeHeader(headerName)
                for (headerValue in headerValues) {
                    requestBuilder.addHeader(headerName, headerValue)
                }
            } else if (headerValues.size == 1) {
                requestBuilder.header(headerName, headerValues[0])
            }
        }

        client.newCall(requestBuilder.build()).execute().use { response ->
            if (response.code == 429) {
                throw ReCaptchaException("reCaptcha Challenge requested", url)
            }

            val responseBody = response.body?.string()
            val latestUrl = response.request.url.toString()

            return Response(
                response.code,
                response.message,
                response.headers.toMultimap(),
                responseBody,
                latestUrl
            )
        }
    }

    /**
     * Lightweight helper for fetching a YouTube channel page to extract canonical @handle
     * when NewPipeExtractor only surfaces a /channel/UC... URL.
     */
    fun fetchText(url: String): String? {
        return try {
            val req = okhttp3.Request.Builder()
                .get()
                .url(url)
                .header("User-Agent", USER_AGENT)
                .header("Accept-Language", "en-IN,en;q=0.9")
                .build()
            client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return null
                resp.body?.string()
            }
        } catch (_: Throwable) {
            null
        }
    }

    companion object {
        private const val TIMEOUT_SECONDS = 15L
        private const val USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"

        @Volatile
        private var instance: ZeroTubeDownloader? = null

        @JvmStatic
        fun getInstance(): ZeroTubeDownloader {
            return instance ?: synchronized(this) {
                instance ?: ZeroTubeDownloader().also { instance = it }
            }
        }
    }
}
