// Help & FAQ copy, as supplied by the product team (AGM, Hackathon and Product Launch FAQ
// sheets, 2026-10-02). Kept word-for-word apart from spelling fixes. `\n` marks a line break
// the sheets show inside an answer (steps, or the mobile/web split).

export type FaqItem = { tag: string; q: string; a: string };

export const FAQ_SECTIONS = {
  AGM: [
    {
      tag: "General",
      q: "What is an AGM on Attend?",
      a: "An AGM (annual general meeting) is a company meeting where shareholders can view meeting details, confirm attendance, appoint a proxy, vote on resolutions, join the live session, ask questions, and download receipts or minutes.",
    },
    {
      tag: "Finding an AGM",
      q: "How do I find an AGM?",
      a: "Tap AGM in the menu. Open the meeting that you want to attend.",
    },
    {
      tag: "Identity Verification",
      q: "Do I need to verify my identity?",
      a: "Yes, if you want to vote. When you open an AGM or tap Resolution, Verify Identity appears first. Complete BVN verification and the liveness check to verify identity. If you are not a shareholder for that AGM, you will see: “You are not a shareholder for this AGM.”",
    },
    {
      tag: "Identity Verification",
      q: "What if my account is not verified?",
      a: "If your account is not verified, you will be unable to join AGM until verification is completed.",
    },
    {
      tag: "Proxy",
      q: "How do I appoint a proxy?",
      a: "Log in to Attend app, confirm RSVP, input proxy's full name and e-mail address, a receipt/QR code is generated, shareholder downloads and sends the receipt to the proxy. Proxy uses QR code on the receipt to log in, after log in, proxy selects the AGM and enters proxy code. If code is correct, proxy is ushered into the live meeting.",
    },
    {
      tag: "Voting",
      q: "How does Pre-AGM Voting work?",
      a: "If you may not be opportune to join the live AGM session, you can pre-vote and see your vote count even in your absence. To pre-vote, log in to Attend, navigate to your AGM, confirm Attendance/RSVP and pre-vote.",
    },
    {
      tag: "Voting",
      q: "Can I change my vote?",
      a: "Yes, until voting closes. After you submit, your votes move to Already voted. You can update them before vote deadline.",
    },
    {
      tag: "Live AGM",
      q: "How do I vote during the live AGM?",
      a: "When an AGM is live, tap Join Live. Cast votes as resolutions are opened.",
    },
    {
      tag: "Q&A",
      q: "How do I ask a question?",
      a: "Open the Q&A tab, type your question, and send. You can also upvote other shareholders’ questions.",
    },
    {
      tag: "Quorum",
      q: "What is a quorum?",
      a: "Quorum shows whether enough shareholders (by attendance and/or shareholding) are present for the meeting to be valid. Watch the live quorum indicator during the meeting.",
    },
    {
      tag: "Receipts",
      q: "Where can I see how I voted?",
      a: "On mobile;\nAfter voting, click on more, then my receipts, download receipts.\nOn web;\nNavigate to the closed AGM, click on an AGM, download receipts.",
    },
    {
      tag: "Minutes",
      q: "Where can I find meeting minutes?",
      a: "After the meeting ends, go to AGM → Minutes. Minutes are ONLY available after the meeting ends.",
    },
    {
      tag: "Attendance / RSVP",
      q: "How do I confirm attendance / RSVP?",
      a: "If your account is verified, you will see a button to confirm attendance. When you open an AGM, tap Confirm Attendance or RSVP. After confirming, you will have access to the live meeting and resolution.",
    },
    {
      tag: "Support",
      q: "Who do I contact for help and support?",
      a: "Log in to Attend, navigate to AGM, click on support.",
    },
  ],
  Innovation: [
    {
      tag: "Registration",
      q: "How do I register for a hackathon event?",
      a: "Use the registration link provided by the organisers, complete the required information, provide your NIN, do a liveness check and submit your registration.",
    },
    {
      tag: "Registration",
      q: "Can I edit my registration details?",
      a: "If the platform allows edits, update your details from your account. If you cannot, contact the support team.",
    },
    {
      tag: "Applications",
      q: "How do I apply for a challenge?",
      a: "Open a challenge, tap Apply, enter your team name, project title and description, add team members, upload the required files, add your repository link, and tap Submit Application.",
    },
    {
      tag: "Submission",
      q: "How do I know my submission was received?",
      a: "Once you submit, you will receive an in-app and email confirmation.",
    },
    {
      tag: "Challenge Engagement",
      q: "How do I submit my hackathon solution?",
      a: "Use the Submission Portal on Attend to upload the required materials within the defined submission window. Participants can submit prototype links, pitch decks, demo videos, and written solutions, as applicable to the challenge requirements.",
    },
    {
      tag: "Uploads",
      q: "How do I add my project repository?",
      a: "Add your repository link in the designated field on the application form. The GitHub link should be a valid repository URL.",
    },
    {
      tag: "Team",
      q: "Can I participate as an individual or as a team?",
      a: "This depends on the specific hackathon rules. Check the event guidelines or contact the organisers.",
    },
    {
      tag: "Challenge Engagement",
      q: "Can I download materials from the Resource Library?",
      a: "Yes. Available challenge briefs, datasets, reference documents, and sponsor materials can be downloaded from the Resource Library.",
    },
    {
      tag: "Challenge Engagement & Judging",
      q: "Where can I watch the challenge sessions?",
      a: "Challenge sessions, including problem briefings, mentor sessions, workshops, and keynotes, can be accessed through the live session streams on Attend.",
    },
    {
      tag: "Challenge Engagement",
      q: "Who can watch the Finalist Showcase?",
      a: "The Finalist Showcase Stream is open to all registered challenge followers.",
    },
    {
      tag: "Status Tracking",
      q: "How do I check my application status?",
      a: "Go to Innovation → My Applications. You will see the current status of your application.",
    },
    {
      tag: "Status Tracking",
      q: "What application statuses can I see?",
      a: "Application statuses may include Submitted, Under Review, Shortlisted, Rejected, or Selected.",
    },
    {
      tag: "Judging",
      q: "What happens after I am shortlisted?",
      a: "Your application moves to the judging stage. Judges score the project using the criteria set by the organiser. Final results will be displayed in My Applications.",
    },
    {
      tag: "Judging",
      q: "How do judges evaluate submissions?",
      a: "Judges access their assigned submissions through the Judging Dashboard and evaluate them using the provided scoring rubric and evaluation form.",
    },
    {
      tag: "Judging",
      q: "How can judges get onboarded?",
      a: "Organizer initiates the process by entering email of the judge as username.\nA judge receives invitation link with username and default password.\nJudge clicks on link to confirm username and is redirected to judging dashboard.",
    },
    {
      tag: "Judging",
      q: "When will the winners be announced?",
      a: "The announcement date will be communicated by the hackathon organisers through the official event channels.",
    },
    {
      tag: "Certificates",
      q: "How can I find my certificate?",
      a: "You will be able to receive your certificate via your registered email.",
    },
    {
      tag: "Certificates",
      q: "What are the categories of certificates to be issued?",
      a: "Categories of certificates are Winners and Participants. Depending on the type of challenge, it can have single winner+multiple participants or multiple winners+multiple participants.",
    },
    {
      tag: "Notifications",
      q: "How will I receive hackathon updates?",
      a: "Specific hackathon updates may be communicated through Attend in-app notifications and/or the email address associated with your registration. However, for general hackathon updates, please check Attend website on www.experienceattend.com and subscribe to our mailing list.",
    },
    {
      tag: "Cross-Platform Visibility",
      q: "Can the app work for mobile and web?",
      a: "Yes, Attend app is available on both mobile and web.",
    },
    {
      tag: "Support",
      q: "Who do I contact if I have an issue with an Innovation challenge?",
      a: "Contact support on Innovation module and provide your full name and email address, the challenge name, and a screenshot of the issue to help the support team investigate.",
    },
  ],
  "Product Launch": [
    {
      tag: "General",
      q: "What is a Product Launch on Attend?",
      a: "A Product Launch is a special event where a company unveils a new product. You can view launch details, RSVP, watch the live reveal, ask questions, answer polls, and access documents after they are released.",
    },
    {
      tag: "Finding a Launch",
      q: "How do I find a product launch event on Attend?",
      a: "Tap Launches in the menu, or open it from Home.\nSelect the launch you want to attend.\nClick and verify your identity with your NIN and liveness check\nClick on ‘apply’ for the challenge of choice",
    },
    {
      tag: "Countdown",
      q: "What is the countdown?",
      a: "The countdown shows the time left until the official reveal. The live stream and embargoed files should unlock at that same time.",
    },
    {
      tag: "Live Stream",
      q: "How do I watch the launch?",
      a: "When verified and event goes live, tap ‘Join Live’ on the launch page.",
    },
    {
      tag: "Q&A",
      q: "How do I ask a question?",
      a: "Open the Q&A tab and type your question to the product team.",
    },
    {
      tag: "Polls",
      q: "What are live polls?",
      a: "During the presentation, polls may appear on screen. Select your answer. Poll options should be clear, for example Excellent or Good.",
    },
    {
      tag: "Documents",
      q: "Where do I find documents after the launch?",
      a: "On the event page, and also under Profile → Documents. The recording should also appear on the event page after the launch.",
    },
    {
      tag: "RSVP",
      q: "Can I cancel my RSVP?",
      a: "Yes. Cancellation can be done before the event goes live. To cancel, Open the launched event and tap Cancel RSVP.",
    },
    {
      tag: "Support",
      q: "Who do I contact for help and support?",
      a: "Log in to Attend, navigate to Product Launch, click on support.",
    },
  ],
} satisfies Record<string, FaqItem[]>;

export type FaqSection = keyof typeof FAQ_SECTIONS;
export const FAQ_TABS = Object.keys(FAQ_SECTIONS) as FaqSection[];
