/* =========================================================
   Patient story content.
   To add a new story: copy one object below, change the slug,
   and fill in the fields. Nothing else needs to change —
   stories.html and stories.js read this file automatically.
   ========================================================= */
window.PATIENT_STORIES = [
  {
    slug: "fatigue",
    title: "\u201cI thought I was just tired.\u201d",
    subtitle: "On fatigue that doesn't go away with rest",
    intro: "A patient came in after feeling more tired than usual for a few weeks.",
    dialogue: [
      { q: "When did you first notice it?", a: "I think it started a few weeks ago. At first, I thought it was because of work. I was busy, so I didn't think much about it." },
      { q: "Was it happening every day?", a: "No. Some days I felt completely fine. But on some days, I would feel tired even after sleeping." },
      { q: "How was it affecting your normal day?", a: "I could still do my work, but I didn't have much energy after that. Earlier I used to do things after work, but recently I just wanted to rest." },
      { q: "Did you notice anything else?", a: "I was getting headaches sometimes. I also felt that I wasn't able to concentrate properly." },
      { q: "How was your sleep?", a: "I was sleeping at my usual time, but I didn't feel fresh when I woke up." },
      { q: "Did you notice any change in your routine?", a: "Not really. That's why I thought it was just normal tiredness." },
    ],
    relateIntro: "Sometimes these changes are very small and easy to ignore. You may have noticed that:",
    relatePoints: [
      "You are getting tired more easily than before.",
      "You sleep, but still don't feel rested.",
      "You find it harder to concentrate.",
      "You have started getting headaches or other small changes.",
      "You need more rest after your usual work.",
      "You keep thinking, \u201cMaybe I'm just tired.\u201d",
    ],
    relateClose: "Everyone feels tired sometimes. But when something keeps happening or starts becoming part of your everyday life, it is worth paying attention to.",
    actionPoints: [
      "Start by noticing when the tiredness happens, how often it happens, and whether anything else happens along with it.",
      "If you haven't had a routine health check recently, consider getting one.",
      "If the tiredness continues, keeps coming back, or starts affecting your normal work and daily activities, it's a good idea to speak with a doctor.",
    ],
    urgent: "If symptoms are sudden, severe, or getting worse, seek medical attention promptly.",
  },
  {
    slug: "headache",
    title: "\u201cMy headaches started becoming part of my day.\u201d",
    subtitle: "On headaches that keep coming back",
    intro: "A patient came in after having headaches on and off for some time.",
    dialogue: [
      { q: "When did you first notice the headaches?", a: "I don't remember the exact day. In the beginning, it was only once in a while, so I didn't think much about it." },
      { q: "How often were you getting them later?", a: "After some time, it started happening more often. Some weeks I would get it two or three times." },
      { q: "What was it like when you had the headache?", a: "It was usually a dull pain. Sometimes it would stay for a few hours. I would try to continue my work, but I didn't feel comfortable." },
      { q: "Did anything seem to bring it on?", a: "I noticed it more on days when I was very busy. Sometimes I had been looking at a screen for many hours." },
      { q: "Did you have anything else along with it?", a: "Sometimes I just wanted to sit somewhere quiet. I didn't feel like doing much until it settled." },
      { q: "Did you take anything for it?", a: "Sometimes I would just rest and wait for it to go away. I didn't want to keep taking something every time it happened." },
    ],
    relateIntro: "Headaches are common, and many people simply continue with their day when they happen. You might have noticed:",
    relatePoints: [
      "Headaches coming back every few days or weeks.",
      "A headache after a long day of work.",
      "Feeling uncomfortable looking at a screen for a long time.",
      "Wanting to sit somewhere quiet when the headache starts.",
      "Taking rest and waiting for it to settle.",
      "Noticing that the headaches are becoming more frequent than before.",
    ],
    relateClose: "Sometimes you get used to something simply because it has been happening for a while.",
    actionPoints: [
      "If headaches keep coming back, notice when they happen, how long they last, how often they occur, and whether anything seems to bring them on.",
      "Getting enough rest, staying hydrated, and maintaining regular meals can also be part of looking after your general health.",
      "If the headaches continue, become more frequent, or start affecting your normal activities, consider discussing them with a doctor.",
    ],
    urgent: "If a headache is sudden and extremely severe, or comes with weakness, confusion, fainting, difficulty speaking, vision changes, or other concerning symptoms, seek urgent medical attention.",
  },
];
