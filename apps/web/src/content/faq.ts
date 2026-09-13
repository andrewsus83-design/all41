export type FaqItem = { id: string; q: string; a: string };

/**
 * Homepage stays lean; the depth + SEO/GEO value lives here (Master §8).
 * Self-contained answers, plain words, concrete numbers — the citation goldmine for AI answers.
 * The "Are you sure it's good?" answer is followed by a "See the benchmark →" link on the FAQ page.
 */
export const FAQ: FaqItem[] = [
  {
    id: "learn",
    q: "Do I need to know anything about AI?",
    a: "No. Say what you need in plain words, like a colleague. No prompts, no settings.",
  },
  {
    id: "api-keys",
    q: "Do I need API keys?",
    a: "Never. That part is ours.",
  },
  {
    id: "accuracy",
    q: "Why do AI answers get things wrong — how is this different?",
    a: "Ordinary AI guesses to sound confident. all41 answers from your files + the live web, shows sources, and double-checks important jobs before you see them.",
  },
  {
    id: "models",
    q: "Which AI does it use? Is it the best?",
    a: "It changes daily — that's the point. We test the models every day and send each job to whichever won today.",
  },
  {
    id: "cost",
    q: "Why cheaper than my subscriptions?",
    a: "You pay for work, not tools you forgot you're paying for. A few dollars a task, shown before it runs. No monthly fee.",
  },
  {
    id: "memory",
    q: "Does it remember my past work?",
    a: "Yes — files and past jobs stay connected, so each job starts smart. Tired of re-explaining to AI? You won't here.",
  },
  {
    id: "how",
    q: "How do you use \"all\" the AIs and keep it cheap?",
    a: "For each job we pick the specialist AI, give it only the context it needs, and combine the right tools behind the scenes. Better results, no dozen subscriptions.",
  },
  {
    id: "expire",
    q: "Do credits expire?",
    a: "After 12 months. No monthly reset.",
  },
  {
    id: "benchmark",
    q: "Are you sure it's good?",
    a: "Every month we run the same job three ways — all41, regular AI, a professional — and let independent judges score them blind. We publish the results.",
  },
  {
    id: "privacy",
    q: "Is my data private?",
    a: "Your data answers your questions only.",
  },
];
