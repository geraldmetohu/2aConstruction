// Ready-made marketing emails. Every one is editable before sending; edits can be saved as your own template.
// Write {{first_name}} where the person's first name should go (it becomes "there" when we don't know it).

export interface EmailContent {
  subject: string;
  /** The grey line many inboxes show after the subject. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  bullets: string[];
  buttonLabel: string;
  buttonUrl: string;
  /** Picture under the heading (a path on the website like /loft.jpg, or a full https link); empty for none. */
  imageUrl: string;
  signOff: string;
}
export interface StarterTemplate { id: string; name: string; category: string; content: EmailContent }

const sign = "Best wishes,\nThe 2A Construction team";

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "extension-planning", name: "Planning an extension this year", category: "Seasonal",
    content: {
      subject: "Planning an extension? Now is the time to start",
      preheader: "Design, approvals and a fixed price – before the busy season fills up.",
      heading: "Thinking about extending your home?",
      paragraphs: [
        "Hi {{first_name}},",
        "Most extensions start on site three to four months after the first visit – drawings, structural calculations, planning or permitted-development checks and Building Control all take time. Starting the conversation now means your build can begin when the weather is on your side.",
        "We look after the whole job: survey, drawings, approvals, the build and the finishes, with one team and one fixed price. You'll have your own online project page to follow every stage, photo and payment.",
      ],
      bullets: ["Free site visit and honest advice on what's possible", "Clear, itemised quote – no surprises", "Building Control sign-off and a written workmanship guarantee"],
      buttonLabel: "Book a free site visit", buttonUrl: "/contact#quote", imageUrl: "/extention.jpeg", signOff: sign,
    },
  },
  {
    id: "loft-conversion", name: "Loft conversions", category: "Services",
    content: {
      subject: "Add a bedroom and bathroom without moving house",
      preheader: "Hip-to-gable, dormer and Velux loft conversions – from survey to sign-off.",
      heading: "Your loft could be your favourite room",
      paragraphs: [
        "Hi {{first_name}},",
        "A loft conversion is usually the most cost-effective way to add space – often a double bedroom with its own shower room – and it can add real value to your home.",
        "We handle the steels, structure, stairs, insulation, fire safety and finishes, and we keep you updated at every stage. Most lofts take 6–8 weeks, and the noisy work is done from the roof, so you can stay in your home.",
      ],
      bullets: ["Dormer, hip-to-gable, L-shaped and roof-light conversions", "Structural engineer and Building Control included", "Fixed price agreed before we start"],
      buttonLabel: "Get a loft quote", buttonUrl: "/estimator", imageUrl: "/loft.jpg", signOff: sign,
    },
  },
  {
    id: "winter-roof-check", name: "Roof check before winter", category: "Seasonal",
    content: {
      subject: "Is your roof ready for winter?",
      preheader: "A quick check now can save a costly leak later.",
      heading: "Get your roof checked before the storms",
      paragraphs: [
        "Hi {{first_name}},",
        "Slipped tiles, worn flashing and blocked gutters are easy to fix in autumn – and expensive once water gets in. Our roofers can check your roof, gutters and chimney and send you photos of anything that needs attention.",
        "If something needs doing, you'll get a clear price first. If it doesn't, we'll tell you so.",
      ],
      bullets: ["Tiles, slates, ridges and lead flashing", "Gutters and downpipes cleared and checked", "Flat roofs and chimney stacks"],
      buttonLabel: "Book a roof check", buttonUrl: "/contact#quote", imageUrl: "/roof.jpg", signOff: sign,
    },
  },
  {
    id: "refurbishment", name: "Kitchens, bathrooms & refurbishment", category: "Services",
    content: {
      subject: "Refresh your home with one trusted team",
      preheader: "Kitchens, bathrooms, rewires, plastering and decorating – managed for you.",
      heading: "One team for the whole refurbishment",
      paragraphs: [
        "Hi {{first_name}},",
        "Whether it's a new kitchen, a family bathroom or a full refurbishment, we organise every trade – electricians, plumbers, plasterers, joiners and decorators – so you don't have to.",
        "You'll know who's coming and when, see progress photos in your project page, and pay in clear stages as the work is done.",
      ],
      bullets: ["Kitchens and bathrooms fitted end to end", "Rewiring, heating and plumbing by certified engineers", "Plastering, flooring, joinery and decorating"],
      buttonLabel: "Tell us about your project", buttonUrl: "/estimator", imageUrl: "/refurbishment.jpg", signOff: sign,
    },
  },
  {
    id: "recent-project", name: "A recent project to show", category: "News",
    content: {
      subject: "Before and after: a recent 2A Construction project",
      preheader: "See how one family gained the space they needed.",
      heading: "A project we're proud of",
      paragraphs: [
        "Hi {{first_name}},",
        "We've just finished [describe the project – e.g. a single-storey rear extension with an open-plan kitchen in Hornchurch]. The family wanted [what they wanted]; we delivered [the result] in [time].",
        "You can see the photos and the full story on our website.",
      ],
      bullets: [],
      buttonLabel: "See the project", buttonUrl: "/portfolio/all", imageUrl: "/general.jpg", signOff: sign,
    },
  },
  {
    id: "past-client-checkin", name: "A year on – checking in with past clients", category: "Past clients",
    content: {
      subject: "How is everything since we finished?",
      preheader: "Your guarantee, and anything we can help with.",
      heading: "Just checking in",
      paragraphs: [
        "Hi {{first_name}},",
        "It's been a while since we finished your project and we hope you're still enjoying it. If anything has come up – a door that sticks, a crack in new plaster as the house settles – let us know. It's covered by your workmanship guarantee and we'll put it right.",
        "And if you're thinking about your next project, we'd be glad to help again.",
      ],
      bullets: [],
      buttonLabel: "Get in touch", buttonUrl: "/contact", imageUrl: "", signOff: sign,
    },
  },
  {
    id: "recommend", name: "Ask for a recommendation", category: "Past clients",
    content: {
      subject: "Know someone planning building work?",
      preheader: "Most of our work comes from people like you.",
      heading: "A recommendation means the world to us",
      paragraphs: [
        "Hi {{first_name}},",
        "As a small family firm, most of our work comes from recommendations. If a friend, neighbour or family member is planning an extension, loft or refurbishment, we'd be very grateful if you passed on our details.",
        "We'll look after them the way we looked after you.",
      ],
      bullets: [],
      buttonLabel: "Share our website", buttonUrl: "/", imageUrl: "", signOff: sign,
    },
  },
  {
    id: "permitted-development", name: "Guide: do I need planning permission?", category: "Advice",
    content: {
      subject: "Do you need planning permission for your extension?",
      preheader: "A plain-English guide to permitted development.",
      heading: "Planning permission – a quick guide",
      paragraphs: [
        "Hi {{first_name}},",
        "Many single-storey rear extensions and loft conversions can be built under “permitted development” – without a full planning application – if they stay within certain sizes and rules. Flats, listed buildings and homes in conservation areas have stricter rules.",
        "Building Regulations approval is still needed either way. We check what applies to your home at the first visit and handle the paperwork for you.",
      ],
      bullets: ["Rear extensions: depth and height limits apply", "Loft conversions: volume limits and no dormers facing the road", "We can apply for a Lawful Development Certificate for peace of mind"],
      buttonLabel: "Ask us about your home", buttonUrl: "/contact#quote", imageUrl: "", signOff: sign,
    },
  },
  {
    id: "christmas", name: "Christmas opening times & booking next year", category: "Seasonal",
    content: {
      subject: "Our Christmas opening times – and booking next year's projects",
      preheader: "When we're closed, and how to get a place early in the new year.",
      heading: "Season's greetings from 2A Construction",
      paragraphs: [
        "Hi {{first_name}},",
        "Thank you for your support this year. Our office closes on [date] and reopens on [date]. For emergencies on a current project, call [number].",
        "We're now booking surveys and starts for the new year. If you're planning work, get in touch early to secure your preferred start date.",
      ],
      bullets: [],
      buttonLabel: "Book a survey for the new year", buttonUrl: "/contact#quote", imageUrl: "", signOff: "Merry Christmas and a happy New Year,\nThe 2A Construction team",
    },
  },
];

export const blankContent = (): EmailContent => ({ subject: "", preheader: "", heading: "", paragraphs: ["Hi {{first_name}},", ""], bullets: [], buttonLabel: "", buttonUrl: "", imageUrl: "", signOff: sign });
