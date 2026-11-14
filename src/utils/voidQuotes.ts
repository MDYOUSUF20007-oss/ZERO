/**
 * Curated Stoic & Mindful Wisdom Quotes for The Void
 * Designed to anchor mental stillness and unwavering discipline during deep focus.
 */

export interface VoidQuote {
  quote: string;
  author: string;
}

export const VOID_QUOTES: readonly VoidQuote[] = [
  {
    quote: 'You have power over your mind - not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
  },
  {
    quote: 'We suffer more often in imagination than in reality.',
    author: 'Seneca',
  },
  {
    quote: 'No person has the power to have everything they want, but it is in their power not to want what they have not.',
    author: 'Seneca',
  },
  {
    quote: 'First say to yourself what you would be; and then do what you have to do.',
    author: 'Epictetus',
  },
  {
    quote: 'Silence is a source of great strength.',
    author: 'Lao Tzu',
  },
  {
    quote: 'There is nothing outside of yourself that can enable you to get better, stronger, richer, quicker, or smarter. Everything is within.',
    author: 'Miyamoto Musashi',
  },
  {
    quote: 'Deciding what not to do is as important as deciding what to do.',
    author: 'Steve Jobs',
  },
  {
    quote: 'The successful warrior is the average man, with laser-like focus.',
    author: 'Bruce Lee',
  },
  {
    quote: 'He who has a why to live can bear almost any how.',
    author: 'Friedrich Nietzsche',
  },
  {
    quote: 'Between stimulus and response there is a space. In that space is our power to choose our response.',
    author: 'Viktor Frankl',
  },
  {
    quote: 'It is not a daily increase, but a daily decrease. Hack away at the unessential.',
    author: 'Bruce Lee',
  },
  {
    quote: 'Do not seek for things to happen the way you want them to; rather, wish that what now happens happens the way it happens: then you will be happy.',
    author: 'Epictetus',
  },
  {
    quote: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.',
    author: 'Marcus Aurelius',
  },
  {
    quote: 'Concentrate every minute like a Roman—like a man—on doing what’s in front of you with precise and genuine seriousness.',
    author: 'Marcus Aurelius',
  },
];

export function getRandomVoidQuote(motto?: string | null): VoidQuote {
  if (motto && motto.trim().length > 3) {
    // 40% chance to show user's custom personal motto, 60% curated masters
    if (Math.random() < 0.4) {
      return {
        quote: motto.trim(),
        author: 'Personal Motto',
      };
    }
  }
  const index = Math.floor(Math.random() * VOID_QUOTES.length);
  return VOID_QUOTES[index];
}
