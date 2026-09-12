export type FaqItem = { id: string; q: string; a: string };

export const FAQ: FaqItem[] = [
  {
    id: "learn",
    q: "Do I need to know anything about AI?",
    a: "No. Describe the job in plain words, like you would to a colleague. No prompts to learn, no settings, nothing to pick. If you can write a sentence, you can use all41.",
  },
  {
    id: "models",
    q: "Which AI does the work?",
    a: "The well-known ones, used directly. We test them every day on each kind of job and send yours to the one doing best. You never choose. The full list is on the Resources page.",
  },
  {
    id: "why-change",
    q: "Why might the AI change from day to day?",
    a: "Because the best one for a job changes. We test every day so you don't have to. You always get today's best pick for research, writing, summaries and so on.",
  },
  {
    id: "api-keys",
    q: "Do I need API keys or accounts with AI companies?",
    a: "Never. That part is ours. You do not sign up anywhere else, paste keys, or manage limits. You describe the job.",
  },
  {
    id: "data",
    q: "Where is my data?",
    a: "In your own account, and only there. Nobody else's tasks can see it. Files you add go into a private folder that only you can reach, and they are used only to answer your own questions.",
  },
  {
    id: "cost",
    q: "What does a task cost?",
    a: "You see the price before you run it. Most tasks land between $0.05 and $0.25. An app that searches, reads pages and writes a report costs more than a single question, because it does more work.",
  },
  {
    id: "app",
    q: "What is an app here?",
    a: "A ready-made job — say, watching a competitor's pricing — with a few blanks left for you. You fill them in by answering three or four questions in chat. Nothing to build, nothing to install.",
  },
  {
    id: "grounded",
    q: "Does it use my own files and notes?",
    a: "Yes. Answers are built from what you have added — files, earlier results, notes — and every claim shows where it came from. For important jobs we run a second check against the sources and flag anything that does not line up.",
  },
  {
    id: "expire",
    q: "Do credits expire?",
    a: "After 12 months. There is no monthly reset. Use it slowly or quickly; nothing is lost in between.",
  },
  {
    id: "refunds",
    q: "Refunds?",
    a: "Unused top-up credit can be refunded on request. Credit spent on finished tasks cannot, because the AI cost was already paid. Failed runs are not charged.",
  },
  {
    id: "team",
    q: "Can my team use it?",
    a: "Not yet. Shared workspaces with a shared balance are coming. Today each account is one person.",
  },
  {
    id: "developers",
    q: "Is it for developers?",
    a: "No. It is for people who run things — founders, consultants, agency owners, freelancers. Nothing to code, nothing to configure.",
  },
  {
    id: "free",
    q: "What is the $2 free credit?",
    a: "Once per verified email, you get $2 to run real tasks. Part of it is used in your first run so you see the whole loop. No card needed.",
  },
  {
    id: "schedule",
    q: "Can I have things run on a schedule?",
    a: "Yes. Any app can run once, daily, weekly or monthly, and send the result to chat, email or your dashboard. It is one answer in the setup chat.",
  },
  {
    id: "money",
    q: "How do you make money?",
    a: "A fixed mark-up on the real AI cost, plus a small platform fee. Both are disclosed. The price you see before a run is the price you pay. If AI prices drop, ours drop.",
  },
];
