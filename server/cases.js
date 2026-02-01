import { getLocalized, normalizeLanguage } from "./i18n.js";
import { createDefaultMemory, normalizeMemory } from "./memory.js";

const loc = (en, el = en) => ({ en, el });

const CASE_LIBRARY = [
  {
    id: "stage-door-1897",
    title: loc("Stage Door Silence"),
    subtitle: loc("Adelphi Theatre, London  -  1897"),
    headline: loc("A beloved actor is stabbed after curtain call."),
    synopsis: loc(
      "Backstage grudges, public threats, and a narrow window outside the stage door.") ,
    plot: loc(
      "A celebrated actor is killed moments after leaving the stage door. The company is locked inside as rumors spread about old grudges, a missed promotion, and a critic who met the victim privately."
    ),
    solution: loc(
      "The dismissed actor waited outside the stage door and attacked the victim in a surge of resentment, then tried to blend into the crowd while others scrambled to protect reputations."
    ),
    truth: {
      killer_id: "rowan",
      method: "pocket knife attack at the stage door",
      motive: "resentment over being blacklisted and replaced",
      timeline: [
        "8:40 PM victim argues with the understudy in wardrobe",
        "8:55 PM the dismissed actor is seen loitering by the stage door",
        "9:05 PM the victim exits for a short walk",
        "9:12 PM the victim collapses near the stage door"
      ],
      planted_evidence: ["torn ticket stub", "missing stage-door pass"]
    },
    public_state: {
      victim_name: loc("Edmund Vale"),
      victim_role: loc("Lead Actor"),
      case_time: loc("9:12 PM"),
      case_location: loc("Adelphi Theatre stage door, London"),
      case_briefing: loc(
        "You are the detective called to the Adelphi Theatre just after curtain call. Inside, company manager Gideon has already spoken with critic Milo, while Lydia the understudy has huddled with wardrobe mistress Ada and the dismissed actor Rowan keeps himself apart. The victim Edmund Vale clashed with colleagues and left without an escort, so the story splintered fast. Harriet at the stage door is your closest access to the entry log and the crowd outside is pressing in.",
        "Είσαι ο ντετέκτιβ που καλείται στο θέατρο Adelphi αμέσως μετά το φινάλε. Μέσα, ο διευθυντής του θιάσου Gideon έχει ήδη μιλήσει με τον κριτικό Milo, ενώ η αναπληρώτρια Lydia έχει κουλουριαστεί με την υπεύθυνη κοστουμιών Ada και ο απολυμένος Rowan κρατιέται μακριά. Το θύμα Edmund Vale συγκρούστηκε με συναδέλφους και έφυγε χωρίς συνοδεία, οπότε η ιστορία διαλύθηκε γρήγορα. Η Harriet στη σκηνική πόρτα είναι η πιο άμεση πρόσβασή σου στο βιβλίο εισόδων και το πλήθος έξω πιέζει."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("bloodied playbill")],
      public_accusations: [],
      tensions: [loc("press gathering outside"), loc("company locked in")]
    },
    characters: [
      {
        id: "rowan",
        name: "Rowan Pike",
        role: loc("Dismissed Actor"),
        psycho: [
          loc("bitter"),
          loc("volatile"),
          loc("theatrical"),
          loc("fixated"),
          loc("proud"),
          loc("restless"),
          loc("easily slighted")
        ],
        goals: [loc("avoid arrest"), loc("justify the grievance"), loc("shift blame")],
        secrets: [loc("stalked the victim after rehearsals"), loc("is the killer")],
        private_facts: {
          true_alibi: loc("outside the stage door from 8:55 to 9:10"),
          lie_alibi: loc("at the tavern around the corner"),
          motive: loc("felt blacklisted and replaced"),
          suspicion_id: "lydia",
          observation: {
            text: loc("I saw the understudy slipping a letter into the prop box."),
            evidence: loc("unsigned letter")
          },
          leverage: loc("knows the manager falsified a schedule")
        },
        knowledge: [loc("The victim left alone right after curtain call.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "harriet",
        name: "Harriet Cole",
        role: loc("Stage Door Attendant"),
        psycho: [
          loc("vigilant"),
          loc("rule-bound"),
          loc("skeptical"),
          loc("protective"),
          loc("terse"),
          loc("observant")
        ],
        goals: [loc("keep her post"), loc("avoid blame for the crowd")],
        secrets: [loc("let someone in without logging it")],
        private_facts: {
          true_alibi: loc("at the stage door desk from 8:50 to 9:15"),
          lie_alibi: loc("in the corridor checking coats"),
          motive: loc("none"),
          suspicion_id: "rowan",
          observation: {
            text: loc("Rowan waited near the lamppost, watching the door."),
            evidence: loc("loitering sighting")
          },
          leverage: loc("keeps the access ledger")
        },
        knowledge: [loc("The manager ordered the door locked early tonight.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "gideon",
        name: "Gideon Marsh",
        role: loc("Company Manager"),
        psycho: [
          loc("calculating"),
          loc("impatient"),
          loc("status-conscious"),
          loc("smooth"),
          loc("risk-tolerant"),
          loc("defensive")
        ],
        goals: [loc("control the story"), loc("protect the company brand")],
        secrets: [loc("owed money to the victim")],
        private_facts: {
          true_alibi: loc("balancing receipts in the office at 9:05"),
          lie_alibi: loc("in the lobby greeting patrons"),
          motive: loc("none"),
          suspicion_id: "milo",
          observation: {
            text: loc("A stage-door pass went missing from the hook."),
            evidence: loc("missing pass")
          },
          leverage: loc("can cancel contracts")
        },
        knowledge: [loc("Security was stretched thin after the matinee." )],
        lie_strategy_tags: ["minimize_finances"]
      },
      {
        id: "lydia",
        name: "Lydia Shaw",
        role: loc("Understudy"),
        psycho: [
          loc("quiet"),
          loc("calculating"),
          loc("ambitious"),
          loc("patient"),
          loc("watchful"),
          loc("resentful")
        ],
        goals: [loc("secure the lead role"), loc("stay out of suspicion")],
        secrets: [loc("argued with the victim about the schedule")],
        private_facts: {
          true_alibi: loc("in wardrobe with the seamstress at 9:05"),
          lie_alibi: loc("in the wings waiting for notes"),
          motive: loc("felt overlooked for the lead"),
          suspicion_id: "rowan",
          observation: {
            text: loc("I heard metal scrape in the alley just before the scream."),
            evidence: loc("metal scrape")
          },
          leverage: loc("knows a critic met the victim privately")
        },
        knowledge: [loc("The victim left backstage without an escort.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "milo",
        name: "Milo Trent",
        role: loc("Theatre Critic"),
        psycho: [
          loc("sharp-tongued"),
          loc("curious"),
          loc("image-conscious"),
          loc("impatient"),
          loc("analytical"),
          loc("aloof")
        ],
        goals: [loc("protect his source"), loc("avoid scandal" )],
        secrets: [loc("met the victim to discuss a rival's bribery")],
        private_facts: {
          true_alibi: loc("in the lobby writing notes at 9:05"),
          lie_alibi: loc("outside smoking with patrons"),
          motive: loc("none"),
          suspicion_id: "gideon",
          observation: {
            text: loc("Someone rushed past with a wrapped hand."),
            evidence: loc("bloodied sleeve")
          },
          leverage: loc("can sway the press")
        },
        knowledge: [loc("The crowd outside is getting restless.")],
        lie_strategy_tags: []
      },
      {
        id: "ada",
        name: "Ada Finch",
        role: loc("Wardrobe Mistress"),
        psycho: [
          loc("meticulous"),
          loc("protective"),
          loc("soft-spoken"),
          loc("observant"),
          loc("anxious"),
          loc("loyal")
        ],
        goals: [loc("shield the cast"), loc("avoid a scandal")],
        secrets: [loc("repaired a torn coat to hide a stain")],
        private_facts: {
          true_alibi: loc("in the wardrobe room from 8:55 to 9:10"),
          lie_alibi: loc("in the stairwell fetching thread"),
          motive: loc("none"),
          suspicion_id: "lydia",
          observation: {
            text: loc("The prop knife rack was unlocked after the show."),
            evidence: loc("unlocked prop rack")
          },
          leverage: loc("has the costume inventory")
        },
        knowledge: [loc("The dismissed actor kept asking for entry tonight.")],
        lie_strategy_tags: ["deflect_mistakes"]
      }
    ]
  },
  {
    id: "bus-stop-1993",
    title: loc("Bus Stop Echo"),
    subtitle: loc("South London  -  1993"),
    headline: loc("A late-night assault leaves a neighborhood on edge."),
    synopsis: loc("A brief attack, a tangled alibi web, and a case that hinges on who spoke first."),
    plot: loc(
      "A student is attacked at a bus stop after a short confrontation. Witness accounts are fragmented, and a tight social group offers overlapping alibis as public pressure mounts."
    ),
    solution: loc(
      "The ringleader and a close friend carried out the attack, while their circle coordinated alibis that later unraveled under scrutiny."
    ),
    truth: {
      killer_id: "kyle",
      method: "group assault with a knife",
      motive: "territorial anger and bias-fueled hostility",
      timeline: [
        "10:20 PM argument outside a corner shop",
        "10:32 PM the group follows the victim to the bus stop",
        "10:38 PM the attack happens on the sidewalk",
        "10:45 PM sirens arrive and the group scatters"
      ],
      planted_evidence: ["discarded trainer", "broken necklace"]
    },
    public_state: {
      victim_name: loc("Jamal Reed"),
      victim_role: loc("Architecture Student"),
      case_time: loc("10:38 PM"),
      case_location: loc("Eltham High Street bus stop, South London"),
      case_briefing: loc(
        "You arrive as the lead investigator at the cordoned bus stop, with Jamal Reed's friend Omar still on the curb. Omar has already compared notes with bus driver Ruth, while Kyle, Dane, and Leah keep close to fixer Nico to align their story. This is a tight neighborhood circle, and loyalties run thicker than facts. Omar is the closest voice to you, but the group is watching who you speak with.",
        "Φτάνεις ως επικεφαλής ερευνητής στη σφραγισμένη στάση λεωφορείου, με τον φίλο του Jamal Reed, τον Omar, ακόμη στο πεζοδρόμιο. Ο Omar έχει ήδη συγκρίνει σημειώσεις με την οδηγό Ruth, ενώ ο Kyle, ο Dane και η Leah μένουν δίπλα στον Nico για να ευθυγραμμίσουν την ιστορία τους. Είναι μια δεμένη γειτονιά και οι πιστές σχέσεις μετρούν περισσότερο από τα γεγονότα. Ο Omar είναι η πιο κοντινή φωνή σου, αλλά η ομάδα προσέχει με ποιον μιλάς."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("broken phone screen")],
      public_accusations: [],
      tensions: [loc("neighbors demanding answers"), loc("conflicting witness stories")]
    },
    characters: [
      {
        id: "kyle",
        name: "Kyle Mercer",
        role: loc("Local Crew Member"),
        psycho: [
          loc("impulsive"),
          loc("territorial"),
          loc("defensive"),
          loc("hot-headed"),
          loc("status-driven"),
          loc("restless")
        ],
        goals: [loc("avoid conviction"), loc("protect his friends"), loc("control the story")],
        secrets: [loc("started the fight"), loc("is the killer")],
        private_facts: {
          true_alibi: loc("near the bus stop at 10:38"),
          lie_alibi: loc("at the arcade across the street"),
          motive: loc("felt disrespected and lashed out") ,
          suspicion_id: "dane",
          observation: {
            text: loc("I saw the bus driver hesitate before pulling in."),
            evidence: loc("bus delay")
          },
          leverage: loc("knows who dropped the knife")
        },
        knowledge: [loc("The victim was walking with a friend.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "dane",
        name: "Dane Holt",
        role: loc("Close Friend"),
        psycho: [
          loc("anxious"),
          loc("loyal"),
          loc("easily led"),
          loc("nervous"),
          loc("avoidant"),
          loc("jumpy")
        ],
        goals: [loc("protect Kyle"), loc("keep his alibi intact")],
        secrets: [loc("hid a bloodied hoodie")],
        private_facts: {
          true_alibi: loc("running with the group at 10:38"),
          lie_alibi: loc("inside the kebab shop"),
          motive: loc("none"),
          suspicion_id: "nico",
          observation: {
            text: loc("Someone dropped a trainer near the curb."),
            evidence: loc("discarded trainer")
          },
          leverage: loc("knows who handled the phone")
        },
        knowledge: [loc("The group agreed on a story in the alley.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "leah",
        name: "Leah Briggs",
        role: loc("Girlfriend"),
        psycho: [
          loc("protective"),
          loc("defiant"),
          loc("quick-tempered"),
          loc("street-smart"),
          loc("guarded"),
          loc("blunt")
        ],
        goals: [loc("shield her partner"), loc("avoid police pressure")],
        secrets: [loc("covered for the group" )],
        private_facts: {
          true_alibi: loc("waiting outside the shop at 10:35"),
          lie_alibi: loc("on the phone at home"),
          motive: loc("none"),
          suspicion_id: "kyle",
          observation: {
            text: loc("I heard someone bragging about the attack."),
            evidence: loc("bragging remark")
          },
          leverage: loc("has messages arranging the meet-up")
        },
        knowledge: [loc("The victim's friend was shouting for help.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "omar",
        name: "Omar Price",
        role: loc("Victim's Friend"),
        psycho: [
          loc("shaken"),
          loc("honest"),
          loc("angry"),
          loc("detail-focused"),
          loc("stubborn"),
          loc("protective")
        ],
        goals: [loc("get justice"), loc("keep facts straight")],
        secrets: [loc("none")],
        private_facts: {
          true_alibi: loc("with the victim at the bus stop"),
          lie_alibi: loc("n/a"),
          motive: loc("none"),
          suspicion_id: "kyle",
          observation: {
            text: loc("The attacker wore a dark jacket with a white stripe."),
            evidence: loc("striped jacket")
          },
          leverage: loc("knows the group by name")
        },
        knowledge: [loc("The attack happened fast, then they ran." )],
        lie_strategy_tags: []
      },
      {
        id: "ruth",
        name: "Ruth Calder",
        role: loc("Bus Driver"),
        psycho: [
          loc("steady"),
          loc("observant"),
          loc("cautious"),
          loc("methodical"),
          loc("calm"),
          loc("blunt")
        ],
        goals: [loc("share what she saw"), loc("avoid blame")],
        secrets: [loc("hesitated before stopping" )],
        private_facts: {
          true_alibi: loc("pulling into the bus stop at 10:38"),
          lie_alibi: loc("already stopped with doors open"),
          motive: loc("none"),
          suspicion_id: "leah",
          observation: {
            text: loc("I saw two people run toward the alley."),
            evidence: loc("alley escape")
          },
          leverage: loc("has route logs")
        },
        knowledge: [loc("There was shouting before the attack.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "nico",
        name: "Nico Ward",
        role: loc("Neighborhood Fixer"),
        psycho: [
          loc("smooth"),
          loc("calculating"),
          loc("protective"),
          loc("pragmatic"),
          loc("evasive"),
          loc("persuasive")
        ],
        goals: [loc("keep the group aligned"), loc("avoid police heat")],
        secrets: [loc("coached alibis" )],
        private_facts: {
          true_alibi: loc("in the alley behind the shop at 10:40"),
          lie_alibi: loc("walking home with a friend"),
          motive: loc("none"),
          suspicion_id: "dane",
          observation: {
            text: loc("Someone tossed a phone into a bin."),
            evidence: loc("bin phone")
          },
          leverage: loc("knows who has the knife")
        },
        knowledge: [loc("The group met again after the sirens." )],
        lie_strategy_tags: ["deny_where_when", "deflect_mistakes"]
      }
    ]
  },
  {
    id: "athens-2012-kidnapping",
    title: loc("Ransom in the Suburbs"),
    subtitle: loc("Glyfada, Athens  -  2012"),
    headline: loc("A vanished heir and a rising ransom demand."),
    synopsis: loc("A disappearance, a ransom pipeline, and a family torn over silence."),
    plot: loc(
      "A well-connected family reports their adult son missing after a night meeting. A familiar face manages the communications, urging silence while money changes hands."
    ),
    solution: loc(
      "The family friend staged the abduction and ordered an accomplice to keep the victim subdued, leading to a fatal outcome during captivity."
    ),
    truth: {
      killer_id: "spiros",
      method: "abduction followed by suffocation in captivity",
      motive: "ransom extraction and debt pressure",
      timeline: [
        "7:20 PM the victim leaves a seaside cafe",
        "7:40 PM the abduction happens in a parking lot",
        "8:10 PM the first ransom call is placed",
        "10:30 PM the victim is harmed during confinement"
      ],
      planted_evidence: ["burner phone", "discarded zip ties"]
    },
    public_state: {
      victim_name: loc("Nikos Asteri"),
      victim_role: loc("Shipping Heir"),
      case_time: loc("7:40 PM"),
      case_location: loc("Glyfada parking lot, Athens"),
      case_briefing: loc(
        "You are brought to the Glyfada marina lot as the family's investigator, just as the first ransom instructions ripple through the household. Spiros, the trusted associate, has been speaking for the family with Dr. Elena, while driver Tasos and contractor Katerina quietly compare notes about the vehicles and drop points. The family is torn over involving police, and every relationship has money threaded through it. Mara, the private investigator already on site, is the closest ally you have as the clock starts.",
        "Σε φέρνουν στο πάρκινγκ της μαρίνας στη Γλυφάδα ως ερευνητή της οικογένειας, την ώρα που οι πρώτες οδηγίες λύτρων διαδίδονται στο σπίτι. Ο Spiros, ο έμπιστος συνεργάτης, μιλά εκ μέρους της οικογένειας με τη Δρ. Elena, ενώ ο οδηγός Tasos και η συνεργάτιδα Katerina συγκρίνουν ήσυχα σημειώσεις για τα οχήματα και τα σημεία παράδοσης. Η οικογένεια διχάζεται για το αν θα εμπλέξει την αστυνομία και κάθε σχέση έχει χρήμα από πίσω. Η Mara, η ιδιωτική ερευνήτρια που είναι ήδη εκεί, είναι η πιο κοντινή σου σύμμαχος καθώς ξεκινά το χρονόμετρο."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("abandoned sedan")],
      public_accusations: [],
      tensions: [loc("family divided on calling police"), loc("ransom clock ticking")]
    },
    characters: [
      {
        id: "spiros",
        name: "Spiros Demos",
        role: loc("Family Associate"),
        portrait_prompt: "Cinematic head-and-shoulders portrait of a calm, authoritative Greek man in his late 60s, salt-and-pepper hair neatly combed, trimmed beard, wearing a tailored navy blazer and open-collar white shirt. Subtle marina evening light, shallow depth of field, 35mm film look, neutral background, serious expression.",
        portrait_path: "/images/athens-2012/spiros.png",
        psycho: [
          loc("calm"),
          loc("manipulative"),
          loc("authoritative"),
          loc("calculating"),
          loc("charming"),
          loc("secretive")
        ],
        goals: [loc("collect the ransom"), loc("control the narrative"), loc("avoid exposure")],
        secrets: [loc("orchestrated the abduction"), loc("is the killer")],
        private_facts: {
          true_alibi: loc("on the phone with the family at 8:10"),
          lie_alibi: loc("driving to the marina"),
          motive: loc("desperate to cover debts"),
          suspicion_id: "tasos",
          observation: {
            text: loc("The driver looked shaken when he returned alone."),
            evidence: loc("driver's panic")
          },
          leverage: loc("handles the family's contacts")
        },
        knowledge: [loc("The ransom caller used a calm voice modulator.")],
        lie_strategy_tags: ["deny_where_when", "minimize_finances"]
      },
      {
        id: "elena",
        name: "Dr. Elena Markos",
        role: loc("Adoptive Mother"),
        portrait_prompt: "Cinematic head-and-shoulders portrait of a composed Greek woman in her early 50s, dark hair in a low bun, minimal jewelry, wearing a crisp light blouse and tailored coat. Soft clinic lighting, 35mm film look, neutral background, controlled but worried expression.",
        portrait_path: "/images/athens-2012/elena.png",
        psycho: [
          loc("composed"),
          loc("guarded"),
          loc("torn"),
          loc("decisive"),
          loc("protective"),
          loc("guilty")
        ],
        goals: [loc("get her son back"), loc("keep the family safe")],
        secrets: [loc("delayed calling police")],
        private_facts: {
          true_alibi: loc("at home receiving calls at 8:10"),
          lie_alibi: loc("at the clinic"),
          motive: loc("none"),
          suspicion_id: "spiros",
          observation: {
            text: loc("The caller used a phrase only insiders would know."),
            evidence: loc("insider phrase")
          },
          leverage: loc("controls the bank transfer")
        },
        knowledge: [loc("Spiros insisted on no police involvement.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "tasos",
        name: "Tasos Veris",
        role: loc("Family Driver"),
        portrait_prompt: "Cinematic head-and-shoulders portrait of a nervous Greek man in his late 30s, short dark hair, light stubble, wearing a practical dark jacket and plain shirt. Evening street lighting, 35mm film look, neutral background, apologetic gaze.",
        portrait_path: "/images/athens-2012/tasos.png",
        psycho: [
          loc("nervous"),
          loc("loyal"),
          loc("submissive"),
          loc("observant"),
          loc("easily pressured"),
          loc("apologetic")
        ],
        goals: [loc("avoid blame"), loc("keep his job")],
        secrets: [loc("helped move the victim's car")],
        private_facts: {
          true_alibi: loc("at the marina lot at 7:40"),
          lie_alibi: loc("waiting outside the family home"),
          motive: loc("none"),
          suspicion_id: "katerina",
          observation: {
            text: loc("I saw a van with its plates covered."),
            evidence: loc("covered plates")
          },
          leverage: loc("knows where the spare keys are kept")
        },
        knowledge: [loc("The victim trusted Spiros completely.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "katerina",
        name: "Katerina Voss",
        role: loc("Logistics Contractor"),
        portrait_prompt: "Cinematic head-and-shoulders portrait of a sharp-eyed woman in her early 40s, short dark hair, no-nonsense style, wearing a charcoal blazer over a dark top. Low, moody lighting, 35mm film look, neutral background, steady and guarded expression.",
        portrait_path: "/images/athens-2012/katerina.png",
        psycho: [
          loc("hard-eyed"),
          loc("impatient"),
          loc("pragmatic"),
          loc("blunt"),
          loc("cautious"),
          loc("greedy")
        ],
        goals: [loc("get paid"), loc("stay out of custody")],
        secrets: [loc("provided the location for captivity")],
        private_facts: {
          true_alibi: loc("near the warehouse at 8:30"),
          lie_alibi: loc("at a late dinner downtown"),
          motive: loc("wanted quick money") ,
          suspicion_id: "spiros",
          observation: {
            text: loc("I heard the victim call out a family nickname."),
            evidence: loc("family nickname")
          },
          leverage: loc("knows who supplied the zip ties")
        },
        knowledge: [loc("The ransom drops were planned days earlier.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "yannis",
        name: "Yannis Petros",
        role: loc("Ransom Courier"),
        portrait_prompt: "Cinematic head-and-shoulders portrait of a restless Greek man in his late 20s, scruffy stubble, slightly messy hair, wearing a zip hoodie under a worn jacket. Nighttime urban lighting, 35mm film look, neutral background, wary expression.",
        portrait_path: "/images/athens-2012/yannis.png",
        psycho: [
          loc("nervous"),
          loc("fast-talking"),
          loc("opportunistic"),
          loc("paranoid"),
          loc("evasive"),
          loc("restless")
        ],
        goals: [loc("avoid charges"), loc("distance himself")],
        secrets: [loc("handled the burner phone")],
        private_facts: {
          true_alibi: loc("circling the drop point at 9:15"),
          lie_alibi: loc("at a bar in Piraeus"),
          motive: loc("none"),
          suspicion_id: "katerina",
          observation: {
            text: loc("A bag of cash was swapped at the seaside road."),
            evidence: loc("cash swap")
          },
          leverage: loc("knows which number called the family")
        },
        knowledge: [loc("The calls always came right on the hour.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "mara",
        name: "Mara Zoi",
        role: loc("Private Investigator"),
        portrait_prompt: "Cinematic head-and-shoulders portrait of a focused woman in her mid 30s, practical short hair, wearing a simple leather jacket over a dark shirt. Cool interior lighting, 35mm film look, neutral background, attentive and skeptical expression.",
        portrait_path: "/images/athens-2012/mara.png",
        psycho: [
          loc("focused"),
          loc("skeptical"),
          loc("tenacious"),
          loc("methodical"),
          loc("plainspoken"),
          loc("observant")
        ],
        goals: [loc("trace the money trail"), loc("protect her client")],
        secrets: [loc("found blood evidence early")],
        private_facts: {
          true_alibi: loc("reviewing the car at 9:30"),
          lie_alibi: loc("still in transit"),
          motive: loc("none"),
          suspicion_id: "spiros",
          observation: {
            text: loc("There was dried blood on the rear seat seam."),
            evidence: loc("blood trace")
          },
          leverage: loc("has surveillance photos")
        },
        knowledge: [loc("The family insisted the case stay quiet.")],
        lie_strategy_tags: []
      }
    ]
  },
  {
    id: "istanbul-2007",
    title: loc("Street of Echoes"),
    subtitle: loc("Istanbul  -  2007"),
    headline: loc("A public editor is shot outside his office."),
    synopsis: loc("A daylight attack fractures into a web of warnings and unanswered questions."),
    plot: loc(
      "A prominent editor is attacked in daylight after receiving threats. A suspect is briefly detained, but questions about who steered the attack and who ignored warnings ripple through the newsroom."
    ),
    solution: loc(
      "A young shooter was directed by an older organizer who tracked the victim's routine, exploiting security gaps despite known threats."
    ),
    truth: {
      killer_id: "cem",
      method: "pistol attack outside the office",
      motive: "ideological incitement and influence",
      timeline: [
        "2:50 PM the shooter arrives near the office",
        "3:05 PM an organizer signals that the victim is leaving",
        "3:15 PM shots are fired on the steps",
        "3:18 PM the shooter is subdued"
      ],
      planted_evidence: ["burner map", "bus ticket"]
    },
    public_state: {
      victim_name: loc("Arda Kir"),
      victim_role: loc("Newspaper Editor"),
      case_time: loc("3:15 PM"),
      case_location: loc("Istanbul newspaper office steps"),
      case_briefing: loc(
        "You step onto the office steps minutes after Arda Kir is shot, with staff in shock and protest chants rising outside. Senior reporter Leyla has already briefed police liaison Hakan on prior threats, while local contact Seref keeps close to young Cem, insisting he acted alone. The newsroom is a web of warnings, grudges, and missed protection. Leyla is the closest to you, with access to the threat letters and the staff who saw the attack.",
        "Ανεβαίνεις τα σκαλιά του γραφείου λίγα λεπτά μετά τον πυροβολισμό του Arda Kir, με το προσωπικό σε σοκ και συνθήματα διαμαρτυρίας να δυναμώνουν έξω. Η ανώτερη ρεπόρτερ Leyla έχει ήδη ενημερώσει τον σύνδεσμο της αστυνομίας Hakan για τις προηγούμενες απειλές, ενώ ο τοπικός διαμεσολαβητής Seref μένει δίπλα στον νεαρό Cem, επιμένοντας ότι έδρασε μόνος. Η αίθουσα σύνταξης είναι ένας ιστός προειδοποιήσεων, πικριών και χαμένης προστασίας. Η Leyla είναι η πιο κοντινή σου πηγή, με πρόσβαση στις επιστολές απειλών και στους μάρτυρες."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("spent shell casing")],
      public_accusations: [],
      tensions: [loc("public protests forming"), loc("security failures questioned")]
    },
    characters: [
      {
        id: "cem",
        name: "Cem Aktan",
        role: loc("Local Youth"),
        psycho: [
          loc("impressionable"),
          loc("nervous"),
          loc("ideological"),
          loc("defiant"),
          loc("young"),
          loc("agitated")
        ],
        goals: [loc("downplay his role"), loc("protect his handler")],
        secrets: [loc("is the shooter"), loc("received guidance from an organizer")],
        private_facts: {
          true_alibi: loc("on the office steps at 3:15"),
          lie_alibi: loc("at a cafe two blocks away"),
          motive: loc("swept up in ideology and praise") ,
          suspicion_id: "seref",
          observation: {
            text: loc("An older man told me the route was clear."),
            evidence: loc("route signal")
          },
          leverage: loc("knows who supplied the pistol")
        },
        knowledge: [loc("The victim came out on the same schedule every day.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "seref",
        name: "Seref Altun",
        role: loc("Local Contact"),
        psycho: [
          loc("calm"),
          loc("calculating"),
          loc("ideological"),
          loc("patient"),
          loc("controlling"),
          loc("evasive")
        ],
        goals: [loc("distance himself"), loc("frame it as lone actor")],
        secrets: [loc("tracked the victim's schedule")],
        private_facts: {
          true_alibi: loc("in a nearby shop at 3:10"),
          lie_alibi: loc("across town at a meeting"),
          motive: loc("wanted to make an example of the editor") ,
          suspicion_id: "hakan",
          observation: {
            text: loc("I saw the police liaison arrive late."),
            evidence: loc("late arrival")
          },
          leverage: loc("has contacts in the neighborhood")
        },
        knowledge: [loc("The shooter was promised praise for loyalty.")],
        lie_strategy_tags: ["deny_where_when", "deflect_mistakes"]
      },
      {
        id: "leyla",
        name: "Leyla Turan",
        role: loc("Senior Reporter"),
        psycho: [
          loc("sharp"),
          loc("protective"),
          loc("tired"),
          loc("blunt"),
          loc("resolute"),
          loc("observant")
        ],
        goals: [loc("expose the truth"), loc("protect the newsroom")],
        secrets: [loc("received a warning call the day before")],
        private_facts: {
          true_alibi: loc("inside the lobby at 3:15"),
          lie_alibi: loc("in the editing room"),
          motive: loc("none"),
          suspicion_id: "seref",
          observation: {
            text: loc("The shooter looked to the right before firing."),
            evidence: loc("rightward glance")
          },
          leverage: loc("has copies of threat letters")
        },
        knowledge: [loc("Police were told about threats last week.")],
        lie_strategy_tags: []
      },
      {
        id: "hakan",
        name: "Hakan Demir",
        role: loc("Police Liaison"),
        psycho: [
          loc("controlled"),
          loc("pragmatic"),
          loc("defensive"),
          loc("political"),
          loc("cautious"),
          loc("stern")
        ],
        goals: [loc("minimize institutional blame"), loc("contain the fallout")],
        secrets: [loc("downplayed the threat assessment")],
        private_facts: {
          true_alibi: loc("arriving at the scene at 3:17"),
          lie_alibi: loc("stationed nearby with backup"),
          motive: loc("none"),
          suspicion_id: "seref",
          observation: {
            text: loc("The security post was empty for two minutes."),
            evidence: loc("empty post")
          },
          leverage: loc("controls access logs")
        },
        knowledge: [loc("The victim requested protection two days ago.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "murat",
        name: "Murat Akyol",
        role: loc("Taxi Driver"),
        psycho: [
          loc("observant"),
          loc("talkative"),
          loc("nervous"),
          loc("practical"),
          loc("streetwise"),
          loc("blunt")
        ],
        goals: [loc("stay out of trouble"), loc("share what he saw")],
        secrets: [loc("drove the shooter to the block")],
        private_facts: {
          true_alibi: loc("dropping off a passenger at 2:55"),
          lie_alibi: loc("stuck in traffic elsewhere"),
          motive: loc("none"),
          suspicion_id: "cem",
          observation: {
            text: loc("The passenger paid in small bills and avoided cameras."),
            evidence: loc("cash fare")
          },
          leverage: loc("remembers the pickup address")
        },
        knowledge: [loc("The passenger kept glancing at the office entrance.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "efe",
        name: "Efe Sarin",
        role: loc("Community Organizer"),
        psycho: [
          loc("intense"),
          loc("political"),
          loc("protective"),
          loc("guarded"),
          loc("impatient"),
          loc("suspicious")
        ],
        goals: [loc("protect the movement"), loc("avoid being framed")],
        secrets: [loc("argued publicly with the victim")],
        private_facts: {
          true_alibi: loc("at a community meeting at 3:10"),
          lie_alibi: loc("walking alone in the square"),
          motive: loc("none"),
          suspicion_id: "hakan",
          observation: {
            text: loc("I saw a second person waiting across the street."),
            evidence: loc("second watcher")
          },
          leverage: loc("has a list of threat callers")
        },
        knowledge: [loc("The victim insisted on leaving without guards.")],
        lie_strategy_tags: ["deny_where_when"]
      }
    ]
  },
  {
    id: "perugia-2007",
    title: loc("House of Clocks"),
    subtitle: loc("Perugia  -  2007"),
    headline: loc("A shared house becomes a media storm."),
    synopsis: loc("Roommate tensions, conflicting timelines, and a break-in that may not be one."),
    plot: loc(
      "A student is found dead in a shared house after a late night. Roommates clash over timelines while a drifter with a history in the neighborhood circles the scene."
    ),
    solution: loc(
      "An outsider broke in and attacked the victim, while roommates' shifting stories and media pressure muddied the early investigation."
    ),
    truth: {
      killer_id: "rico",
      method: "break-in and knife attack",
      motive: "robbery turned violent",
      timeline: [
        "11:00 PM the victim returns to the house",
        "11:20 PM a window is forced from the courtyard",
        "11:35 PM the attack occurs in the bedroom",
        "11:45 PM a roommate discovers the scene"
      ],
      planted_evidence: ["smeared window glass", "muddy shoe print"]
    },
    public_state: {
      victim_name: loc("Nora Hale"),
      victim_role: loc("Exchange Student"),
      case_time: loc("11:45 PM"),
      case_location: loc("Via del Lago townhouse, Perugia"),
      case_briefing: loc(
        "You arrive at the Via del Lago house as the roommates are separated and the street fills with cameras. Lena and Maya have already compared timelines in whispers, while Paolo has been calling bar owner Patric to nail down when Nora left. The housemates' relationships are strained, and everyone is guarding someone else. Ivo the neighbor is the closest to you with a clear sightline to the courtyard, if you can keep the media at bay.",
        "Φτάνεις στο σπίτι της Via del Lago ενώ οι συγκάτοικοι έχουν απομονωθεί και ο δρόμος γεμίζει κάμερες. Η Lena και η Maya έχουν ήδη συγκρίνει χρονολόγια ψιθυριστά, ενώ ο Paolo τηλεφωνεί στον ιδιοκτήτη του μπαρ Patric για να κλειδώσει την ώρα που έφυγε η Nora. Οι σχέσεις των συγκατοίκων είναι τεταμένες και ο καθένας προστατεύει κάποιον. Ο γείτονας Ivo είναι η πιο κοντινή σου πηγή με καθαρή οπτική στο προαύλιο, αν καταφέρεις να κρατήσεις τα ΜΜΕ μακριά."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("muddy shoe print")],
      public_accusations: [],
      tensions: [loc("media swarming the street"), loc("roommates contradicting each other")]
    },
    characters: [
      {
        id: "rico",
        name: "Rico Vale",
        role: loc("Drifter"),
        psycho: [
          loc("opportunistic"),
          loc("restless"),
          loc("defensive"),
          loc("streetwise"),
          loc("volatile"),
          loc("secretive")
        ],
        goals: [loc("avoid capture"), loc("deny the break-in")],
        secrets: [loc("entered the house that night"), loc("is the killer")],
        private_facts: {
          true_alibi: loc("in the courtyard at 11:20"),
          lie_alibi: loc("sleeping at the hostel"),
          motive: loc("wanted money and panicked") ,
          suspicion_id: "lena",
          observation: {
            text: loc("I saw the back door left slightly open."),
            evidence: loc("ajar back door")
          },
          leverage: loc("knows the route through the courtyard")
        },
        knowledge: [loc("The house was quiet until the door slammed.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "lena",
        name: "Lena Marti",
        role: loc("Roommate"),
        psycho: [
          loc("anxious"),
          loc("guarded"),
          loc("defensive"),
          loc("emotional"),
          loc("tired"),
          loc("sensitive")
        ],
        goals: [loc("avoid blame"), loc("protect her privacy")],
        secrets: [loc("lied about when she returned home")],
        private_facts: {
          true_alibi: loc("in her room with headphones at 11:30"),
          lie_alibi: loc("out at a cafe"),
          motive: loc("none"),
          suspicion_id: "paolo",
          observation: {
            text: loc("I heard a heavy step on the stairs."),
            evidence: loc("heavy step")
          },
          leverage: loc("has the house key log")
        },
        knowledge: [loc("Nora argued with someone on the phone earlier.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "paolo",
        name: "Paolo Risi",
        role: loc("Boyfriend"),
        psycho: [
          loc("protective"),
          loc("restless"),
          loc("proud"),
          loc("defensive"),
          loc("impulsive"),
          loc("jealous")
        ],
        goals: [loc("protect Nora's memory"), loc("avoid suspicion")],
        secrets: [loc("argued with the victim earlier")],
        private_facts: {
          true_alibi: loc("on a call in the piazza at 11:10"),
          lie_alibi: loc("already home asleep"),
          motive: loc("none"),
          suspicion_id: "lena",
          observation: {
            text: loc("Her phone kept buzzing after midnight."),
            evidence: loc("late call log")
          },
          leverage: loc("knows who saw her leave the cafe")
        },
        knowledge: [loc("Nora mentioned someone strange near the house.")],
        lie_strategy_tags: ["deny_timing"]
      },
      {
        id: "maya",
        name: "Maya Chen",
        role: loc("Roommate"),
        psycho: [
          loc("analytical"),
          loc("quiet"),
          loc("observant"),
          loc("guarded"),
          loc("precise"),
          loc("reserved")
        ],
        goals: [loc("reconstruct the timeline"), loc("stay out of the spotlight")],
        secrets: [loc("hid a broken window latch")],
        private_facts: {
          true_alibi: loc("studying in the kitchen at 11:25"),
          lie_alibi: loc("at the library"),
          motive: loc("none"),
          suspicion_id: "rico",
          observation: {
            text: loc("The window latch was bent outward."),
            evidence: loc("bent latch")
          },
          leverage: loc("has the study group's timestamps")
        },
        knowledge: [loc("The living room light was on all night.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "ivo",
        name: "Ivo Serra",
        role: loc("Neighbor"),
        psycho: [
          loc("curious"),
          loc("talkative"),
          loc("anxious"),
          loc("helpful"),
          loc("observant"),
          loc("restless")
        ],
        goals: [loc("help the investigation"), loc("avoid involvement")],
        secrets: [loc("saw someone climbing the wall")],
        private_facts: {
          true_alibi: loc("on his balcony at 11:20"),
          lie_alibi: loc("watching TV inside"),
          motive: loc("none"),
          suspicion_id: "rico",
          observation: {
            text: loc("I saw a figure drop into the courtyard."),
            evidence: loc("courtyard drop")
          },
          leverage: loc("knows which window was opened")
        },
        knowledge: [loc("The courtyard gate squeaked at 11:20.")],
        lie_strategy_tags: []
      },
      {
        id: "patric",
        name: "Patric Costa",
        role: loc("Bar Owner"),
        psycho: [
          loc("defensive"),
          loc("quick"),
          loc("irritated"),
          loc("proud"),
          loc("guarded"),
          loc("wary")
        ],
        goals: [loc("clear his name"), loc("protect his business")],
        secrets: [loc("argued with police about questioning")],
        private_facts: {
          true_alibi: loc("closing the bar at 11:30"),
          lie_alibi: loc("already at home"),
          motive: loc("none"),
          suspicion_id: "lena",
          observation: {
            text: loc("The victim left the bar earlier than usual."),
            evidence: loc("early departure")
          },
          leverage: loc("has CCTV from the bar")
        },
        knowledge: [loc("The housemates were tense earlier that week.")],
        lie_strategy_tags: ["deny_timing"]
      }
    ]
  },
  {
    id: "rio-1992",
    title: loc("Studio After Dark"),
    subtitle: loc("Rio de Janeiro  -  1992"),
    headline: loc("A telenovela star dies in a parking lot."),
    synopsis: loc("A closed set, jealous careers, and a partner with a separate timeline."),
    plot: loc(
      "A rising actress is found dead after leaving a late shoot. Cast and crew are locked on set while rivalries and contracts surface behind the scenes."
    ),
    solution: loc(
      "A co-star lured the victim to the parking lot and attacked her, with his spouse helping to misdirect the timeline."
    ),
    truth: {
      killer_id: "andre",
      method: "knife attack in the backlot parking",
      motive: "jealousy and fear of losing his role",
      timeline: [
        "12:45 AM the victim leaves wardrobe for the lot",
        "1:05 AM the co-star follows her to the car",
        "1:20 AM the attack occurs near the back gate",
        "1:28 AM security discovers the body"
      ],
      planted_evidence: ["smeared call sheet", "dropped bracelet"]
    },
    public_state: {
      victim_name: loc("Camila Duarte"),
      victim_role: loc("Rising Actress"),
      case_time: loc("1:20 AM"),
      case_location: loc("Maravista Studios backlot, Rio"),
      case_briefing: loc(
        "You arrive at Maravista Studios with the cast held on set and the backlot sealed. Showrunner Marcos has already met with PR manager Silvia to shape the story, while Paula stays glued to her co-star Andre. Rivalries and contracts run through every conversation, and the timeline is already being edited. Bea the security guard is your closest access to the gate logs and camera gaps.",
        "Φτάνεις στα Maravista Studios με το καστ κρατημένο στο πλατό και το πίσω πάρκινγκ σφραγισμένο. Ο showrunner Marcos έχει ήδη συναντηθεί με την υπεύθυνη δημοσίων σχέσεων Silvia για να διαμορφώσουν την ιστορία, ενώ η Paula μένει κολλημένη στον συμπρωταγωνιστή της Andre. Ανταγωνισμοί και συμβόλαια διαπερνούν κάθε κουβέντα και το χρονολόγιο ήδη αλλοιώνεται. Η Bea, η σεκιούριτι, είναι η πιο άμεση πρόσβασή σου στα αρχεία της πύλης και στα κενά των καμερών."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("torn script page")],
      public_accusations: [],
      tensions: [loc("network execs on-site"), loc("fan frenzy growing")]
    },
    characters: [
      {
        id: "andre",
        name: "Andre Luz",
        role: loc("Co-Star"),
        psycho: [
          loc("charismatic"),
          loc("volatile"),
          loc("proud"),
          loc("jealous"),
          loc("dramatic"),
          loc("image-conscious")
        ],
        goals: [loc("protect his career"), loc("avoid conviction")],
        secrets: [loc("is the killer"), loc("hid the weapon")],
        private_facts: {
          true_alibi: loc("in the parking lot at 1:20"),
          lie_alibi: loc("in the makeup trailer"),
          motive: loc("feared being replaced by Camila") ,
          suspicion_id: "paula",
          observation: {
            text: loc("The security gate was briefly unlatched."),
            evidence: loc("unlatched gate")
          },
          leverage: loc("knows who deleted call times")
        },
        knowledge: [loc("Camila left set alone after a tense exchange.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "paula",
        name: "Paula Luz",
        role: loc("Spouse"),
        psycho: [
          loc("protective"),
          loc("sharp"),
          loc("controlling"),
          loc("defensive"),
          loc("loyal"),
          loc("restless")
        ],
        goals: [loc("shield Andre"), loc("keep their image intact")],
        secrets: [loc("deleted a call sheet entry")],
        private_facts: {
          true_alibi: loc("in the wardrobe trailer at 1:10"),
          lie_alibi: loc("with a publicist"),
          motive: loc("none"),
          suspicion_id: "marcos",
          observation: {
            text: loc("I saw Camila's car lights flicker off."),
            evidence: loc("car lights")
          },
          leverage: loc("has access to the production schedule")
        },
        knowledge: [loc("Andre was furious about last night's rewrite.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "marcos",
        name: "Marcos Vale",
        role: loc("Showrunner"),
        psycho: [
          loc("commanding"),
          loc("stressed"),
          loc("calculating"),
          loc("practical"),
          loc("impatient"),
          loc("brand-focused")
        ],
        goals: [loc("keep the production running"), loc("avoid scandal")],
        secrets: [loc("promised a rewrite to Andre")],
        private_facts: {
          true_alibi: loc("in the writers' room at 1:15"),
          lie_alibi: loc("on a call with the network") ,
          motive: loc("none"),
          suspicion_id: "andre",
          observation: {
            text: loc("The call sheet was smeared on the table."),
            evidence: loc("smeared call sheet")
          },
          leverage: loc("can suspend cast contracts")
        },
        knowledge: [loc("The victim asked to leave early tonight.")],
        lie_strategy_tags: ["minimize_finances"]
      },
      {
        id: "silvia",
        name: "Silvia Rey",
        role: loc("PR Manager"),
        psycho: [
          loc("smooth"),
          loc("image-focused"),
          loc("fast"),
          loc("strategic"),
          loc("guarded"),
          loc("polite")
        ],
        goals: [loc("control the press"), loc("keep sponsors calm")],
        secrets: [loc("leaked a statement early")],
        private_facts: {
          true_alibi: loc("on the press line at 1:25"),
          lie_alibi: loc("with Camila earlier") ,
          motive: loc("none"),
          suspicion_id: "paula",
          observation: {
            text: loc("A bracelet was found near the gate."),
            evidence: loc("dropped bracelet")
          },
          leverage: loc("controls the media list")
        },
        knowledge: [loc("Fans were already gathering before police arrived.")],
        lie_strategy_tags: []
      },
      {
        id: "rui",
        name: "Rui Nascimento",
        role: loc("Driver"),
        psycho: [
          loc("quiet"),
          loc("observant"),
          loc("methodical"),
          loc("nervous"),
          loc("loyal"),
          loc("cautious")
        ],
        goals: [loc("keep his job"), loc("avoid suspicion")],
        secrets: [loc("moved the car after the attack")],
        private_facts: {
          true_alibi: loc("near the back gate at 1:20"),
          lie_alibi: loc("in the garage"),
          motive: loc("none"),
          suspicion_id: "andre",
          observation: {
            text: loc("I heard a sharp metal clink."),
            evidence: loc("metal clink")
          },
          leverage: loc("knows the back gate camera angle")
        },
        knowledge: [loc("Andre left the set without saying where he was going.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "bea",
        name: "Bea Torres",
        role: loc("Security Guard"),
        psycho: [
          loc("alert"),
          loc("rule-bound"),
          loc("blunt"),
          loc("steady"),
          loc("protective"),
          loc("tired")
        ],
        goals: [loc("account for every entry"), loc("avoid blame")],
        secrets: [loc("left her post briefly")],
        private_facts: {
          true_alibi: loc("at the gate at 1:28"),
          lie_alibi: loc("watching cameras the whole time"),
          motive: loc("none"),
          suspicion_id: "rui",
          observation: {
            text: loc("The back gate was open for less than a minute."),
            evidence: loc("open gate")
          },
          leverage: loc("has access logs")
        },
        knowledge: [loc("There was a brief outage on camera three.")],
        lie_strategy_tags: ["deny_where_when"]
      }
    ]
  },
  {
    id: "galicia-2013",
    title: loc("Galicia Silence"),
    subtitle: loc("Santiago de Compostela  -  2013"),
    headline: loc("A respected family reports a sudden loss."),
    synopsis: loc("Public respectability, private control, and a trail of medical purchases."),
    plot: loc(
      "A respected family reports their adult daughter missing, only for her body to be found hours later. The parents' accounts diverge, and a medication trail raises difficult questions."
    ),
    solution: loc(
      "The mother sedated her daughter and staged the disappearance, while the father helped obscure the timeline to protect the family image."
    ),
    truth: {
      killer_id: "rosalia",
      method: "sedation and suffocation",
      motive: "control and fear of exposure",
      timeline: [
        "8:15 PM the daughter returns home for dinner",
        "9:00 PM sedatives are administered",
        "9:40 PM the body is moved to a rural road",
        "10:10 PM the missing report is filed"
      ],
      planted_evidence: ["discarded medicine bottle", "staged phone message"]
    },
    public_state: {
      victim_name: loc("Clara Porto"),
      victim_role: loc("Family Heir"),
      case_time: loc("10:10 PM"),
      case_location: loc("Outskirts of Santiago de Compostela"),
      case_briefing: loc(
        "You arrive on the rural road where Clara Porto was found, while her parents present a united timeline at the family home. Dr. Vega has already spoken with pharmacist Pilar about recent sedative prescriptions, and Iria, Clara's tutor and friend, is pressing to be heard. The family's public image hangs over every answer. Iria is the closest ally to you if you want Clara's side of the story.",
        "Φτάνεις στον επαρχιακό δρόμο όπου βρέθηκε η Clara Porto, ενώ οι γονείς της παρουσιάζουν ενιαίο χρονολόγιο στο σπίτι. Η Δρ. Vega έχει ήδη μιλήσει με τη φαρμακοποιό Pilar για πρόσφατες συνταγές κατασταλτικών, και η Iria, δασκάλα και φίλη της Clara, πιέζει να ακουστεί. Η δημόσια εικόνα της οικογένειας βαραίνει κάθε απάντηση. Η Iria είναι η πιο κοντινή σου σύμμαχος αν θέλεις την πλευρά της Clara."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("discarded medicine bottle")],
      public_accusations: [],
      tensions: [loc("family reputation at stake"), loc("medical trail under scrutiny")]
    },
    characters: [
      {
        id: "rosalia",
        name: "Rosalia Porto",
        role: loc("Mother"),
        psycho: [
          loc("composed"),
          loc("controlling"),
          loc("cold"),
          loc("methodical"),
          loc("image-conscious"),
          loc("decisive")
        ],
        goals: [loc("protect the family name"), loc("avoid conviction")],
        secrets: [loc("is the killer"), loc("handled the sedatives")],
        private_facts: {
          true_alibi: loc("at home at 9:00"),
          lie_alibi: loc("driving to the pharmacy"),
          motive: loc("feared losing control of the family") ,
          suspicion_id: "alfonso",
          observation: {
            text: loc("The daughter's phone was left charging upstairs."),
            evidence: loc("phone left behind")
          },
          leverage: loc("controls the family accounts")
        },
        knowledge: [loc("The missing report was delayed on purpose.")],
        lie_strategy_tags: ["deny_where_when", "minimize_finances"]
      },
      {
        id: "alfonso",
        name: "Alfonso Baeza",
        role: loc("Father"),
        psycho: [
          loc("reserved"),
          loc("loyal"),
          loc("conflicted"),
          loc("guarded"),
          loc("anxious"),
          loc("formal")
        ],
        goals: [loc("support his wife"), loc("avoid scandal")],
        secrets: [loc("helped move the car")],
        private_facts: {
          true_alibi: loc("in the garage at 9:30"),
          lie_alibi: loc("at the office"),
          motive: loc("none"),
          suspicion_id: "rosalia",
          observation: {
            text: loc("A blanket was missing from the trunk."),
            evidence: loc("missing blanket")
          },
          leverage: loc("has access to the house security system")
        },
        knowledge: [loc("Clara wanted to leave the family business.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "dr_vega",
        name: "Dr. Vega Salas",
        role: loc("Family Doctor"),
        psycho: [
          loc("clinical"),
          loc("careful"),
          loc("observant"),
          loc("neutral"),
          loc("precise"),
          loc("soft-spoken")
        ],
        goals: [loc("protect medical ethics"), loc("share accurate facts")],
        secrets: [loc("warned about sedative use")],
        private_facts: {
          true_alibi: loc("on a call at 9:15"),
          lie_alibi: loc("sleeping at home"),
          motive: loc("none"),
          suspicion_id: "rosalia",
          observation: {
            text: loc("Clara showed signs of prolonged sedation."),
            evidence: loc("sedation symptoms")
          },
          leverage: loc("holds prescription records")
        },
        knowledge: [loc("The family requested extra prescriptions last month.")],
        lie_strategy_tags: []
      },
      {
        id: "iria",
        name: "Iria Souto",
        role: loc("Tutor and Friend"),
        psycho: [
          loc("empathetic"),
          loc("alert"),
          loc("stubborn"),
          loc("protective"),
          loc("frustrated"),
          loc("observant")
        ],
        goals: [loc("speak for Clara"), loc("avoid being silenced")],
        secrets: [loc("helped Clara plan a move")],
        private_facts: {
          true_alibi: loc("texting Clara at 8:50"),
          lie_alibi: loc("already asleep"),
          motive: loc("none"),
          suspicion_id: "alfonso",
          observation: {
            text: loc("Clara said someone kept her phone"),
            evidence: loc("missing phone")
          },
          leverage: loc("has Clara's messages")
        },
        knowledge: [loc("Clara feared being controlled.")],
        lie_strategy_tags: []
      },
      {
        id: "nuno",
        name: "Nuno Lira",
        role: loc("Taxi Driver"),
        psycho: [
          loc("practical"),
          loc("talkative"),
          loc("observant"),
          loc("nervous"),
          loc("helpful"),
          loc("blunt")
        ],
        goals: [loc("stay out of trouble"), loc("share his sighting")],
        secrets: [loc("saw the family car on the rural road")],
        private_facts: {
          true_alibi: loc("on the rural road at 9:45"),
          lie_alibi: loc("downtown at the stand"),
          motive: loc("none"),
          suspicion_id: "alfonso",
          observation: {
            text: loc("The family sedan had its lights off."),
            evidence: loc("lights off")
          },
          leverage: loc("knows which direction the car went")
        },
        knowledge: [loc("The road was empty except for that car.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "pilar",
        name: "Pilar Mendez",
        role: loc("Pharmacist"),
        psycho: [
          loc("precise"),
          loc("wary"),
          loc("responsible"),
          loc("curious"),
          loc("steady"),
          loc("reserved")
        ],
        goals: [loc("protect her license"), loc("tell the truth")],
        secrets: [loc("sold an extra bottle after hours")],
        private_facts: {
          true_alibi: loc("closing the pharmacy at 8:40"),
          lie_alibi: loc("already home"),
          motive: loc("none"),
          suspicion_id: "rosalia",
          observation: {
            text: loc("Rosalia insisted on a rush refill."),
            evidence: loc("rush refill")
          },
          leverage: loc("has the purchase receipt")
        },
        knowledge: [loc("The prescription quantity was unusual.")],
        lie_strategy_tags: ["deflect_mistakes"]
      }
    ]
  },
  {
    id: "kassel-2019",
    title: loc("Town Hall Shot"),
    subtitle: loc("Kassel District  -  2019"),
    headline: loc("A regional official is killed at home."),
    synopsis: loc("A late-night killing raises questions about threats and access."),
    plot: loc(
      "A regional official is shot on his terrace after months of threats. Investigators trace a weapon trail and a pattern of intimidation, but the logistics suggest more than one person may have helped."
    ),
    solution: loc(
      "The shooter acted on extremist ideology and accessed a weapon through a close associate, while others downplayed their involvement."
    ),
    truth: {
      killer_id: "stefan",
      method: "rifle shot from close range",
      motive: "extremist ideology and grievance",
      timeline: [
        "10:50 PM the shooter arrives near the house",
        "11:10 PM the victim steps onto the terrace",
        "11:25 PM the shot is fired",
        "11:40 PM the shooter flees via the side road"
      ],
      planted_evidence: ["range receipt", "online threat screenshot"]
    },
    public_state: {
      victim_name: loc("Lukas Becker"),
      victim_role: loc("Regional Official"),
      case_time: loc("11:25 PM"),
      case_location: loc("Kassel district terrace"),
      case_briefing: loc(
        "You arrive at the terrace where Lukas Becker was shot, with investigators already cataloging months of threats. Aide Anja has been briefing security officer Torben, while Markus and Jens trade messages to keep their names out of the record. The victim's routine and the weapon trail tie this to a broader network. Anja is the closest to you with the threat archive, while neighbor Sina can place faces on the side road.",
        "Φτάνεις στη βεράντα όπου πυροβολήθηκε ο Lukas Becker, με τους ερευνητές να καταγράφουν ήδη μήνες απειλών. Η βοηθός Anja ενημερώνει τον υπεύθυνο ασφαλείας Torben, ενώ ο Markus και ο Jens ανταλλάσσουν μηνύματα για να κρατήσουν τα ονόματά τους εκτός φακέλου. Η ρουτίνα του θύματος και η διαδρομή του όπλου συνδέουν την υπόθεση με ευρύτερο δίκτυο. Η Anja είναι η πιο κοντινή σου πηγή με το αρχείο απειλών, ενώ η γειτόνισσα Sina μπορεί να τοποθετήσει πρόσωπα στον παράδρομο."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("online threat screenshot")],
      public_accusations: [],
      tensions: [loc("security lapse under scrutiny"), loc("community on edge")]
    },
    characters: [
      {
        id: "stefan",
        name: "Stefan Kurt",
        role: loc("Range Regular"),
        psycho: [
          loc("rigid"),
          loc("ideological"),
          loc("secretive"),
          loc("defiant"),
          loc("methodical"),
          loc("suspicious")
        ],
        goals: [loc("deny help"), loc("control the narrative")],
        secrets: [loc("is the killer"), loc("practiced at a local range")],
        private_facts: {
          true_alibi: loc("near the terrace at 11:25"),
          lie_alibi: loc("driving on the highway"),
          motive: loc("believed the victim betrayed the country") ,
          suspicion_id: "markus",
          observation: {
            text: loc("A friend handed me a bag days earlier."),
            evidence: loc("transfer bag")
          },
          leverage: loc("knows who stored the rifle")
        },
        knowledge: [loc("The victim kept a predictable evening routine.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "markus",
        name: "Markus Klein",
        role: loc("Range Acquaintance"),
        psycho: [
          loc("defensive"),
          loc("restless"),
          loc("secretive"),
          loc("evasive"),
          loc("proud"),
          loc("impulsive")
        ],
        goals: [loc("distance himself"), loc("keep his license")],
        secrets: [loc("stored the rifle briefly")],
        private_facts: {
          true_alibi: loc("at the range earlier that day"),
          lie_alibi: loc("working late at the shop"),
          motive: loc("none"),
          suspicion_id: "stefan",
          observation: {
            text: loc("Stefan asked about a silenced rifle."),
            evidence: loc("weapon query")
          },
          leverage: loc("has range receipts")
        },
        knowledge: [loc("Stefan was angry about the speech last month.")],
        lie_strategy_tags: ["deflect_mistakes", "deny_where_when"]
      },
      {
        id: "anja",
        name: "Anja Vogel",
        role: loc("Aide"),
        psycho: [
          loc("organized"),
          loc("protective"),
          loc("tired"),
          loc("focused"),
          loc("alert"),
          loc("blunt")
        ],
        goals: [loc("protect the office"), loc("share key threats")],
        secrets: [loc("missed a late threat email")],
        private_facts: {
          true_alibi: loc("in the office finishing reports"),
          lie_alibi: loc("already home asleep"),
          motive: loc("none"),
          suspicion_id: "torben",
          observation: {
            text: loc("The threat email mentioned the terrace."),
            evidence: loc("specific threat")
          },
          leverage: loc("has the threat archive")
        },
        knowledge: [loc("Security was reduced after budget cuts.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "torben",
        name: "Torben Weiss",
        role: loc("Security Officer"),
        psycho: [
          loc("methodical"),
          loc("cautious"),
          loc("defensive"),
          loc("pragmatic"),
          loc("stern"),
          loc("loyal")
        ],
        goals: [loc("explain the security plan"), loc("avoid blame")],
        secrets: [loc("the camera on the side road was down")],
        private_facts: {
          true_alibi: loc("patrolling the front gate at 11:20"),
          lie_alibi: loc("monitoring cameras the whole time"),
          motive: loc("none"),
          suspicion_id: "stefan",
          observation: {
            text: loc("The side camera went dark for two minutes."),
            evidence: loc("camera outage")
          },
          leverage: loc("has the patrol logs")
        },
        knowledge: [loc("The victim insisted on standing outside for air.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "sina",
        name: "Sina Roth",
        role: loc("Neighbor"),
        psycho: [
          loc("observant"),
          loc("anxious"),
          loc("helpful"),
          loc("soft-spoken"),
          loc("shaken"),
          loc("curious")
        ],
        goals: [loc("share what she saw"), loc("stay safe")],
        secrets: [loc("saw a figure on the side road")],
        private_facts: {
          true_alibi: loc("on her balcony at 11:25"),
          lie_alibi: loc("inside with music on"),
          motive: loc("none"),
          suspicion_id: "stefan",
          observation: {
            text: loc("A car idled with its lights off."),
            evidence: loc("idling car")
          },
          leverage: loc("knows the escape direction")
        },
        knowledge: [loc("There had been threats on social media.")],
        lie_strategy_tags: []
      },
      {
        id: "jens",
        name: "Jens Pfeil",
        role: loc("Online Contact"),
        psycho: [
          loc("defensive"),
          loc("sarcastic"),
          loc("detached"),
          loc("evasive"),
          loc("cynical"),
          loc("prickly")
        ],
        goals: [loc("minimize his influence"), loc("avoid scrutiny")],
        secrets: [loc("shared extremist forums")],
        private_facts: {
          true_alibi: loc("online at 11:25"),
          lie_alibi: loc("sleeping"),
          motive: loc("none"),
          suspicion_id: "markus",
          observation: {
            text: loc("Stefan posted a countdown meme."),
            evidence: loc("countdown post")
          },
          leverage: loc("has access to forum logs")
        },
        knowledge: [loc("The shooter talked about the terrace online.")],
        lie_strategy_tags: ["deflect_mistakes"]
      }
    ]
  },
  {
    id: "uppsala-2002",
    title: loc("Winter Oath"),
    subtitle: loc("Uppsala  -  2002"),
    headline: loc("A family conflict ends in tragedy."),
    synopsis: loc("Known threats, family pressure, and a deadly return home."),
    plot: loc(
      "A young community organizer returns home despite warnings. The family insists on reconciliation, but neighbors heard raised voices before a fatal confrontation."
    ),
    solution: loc(
      "The father confronted his daughter about her independence and killed her in a moment of coercive control, while others attempted to deflect blame."
    ),
    truth: {
      killer_id: "rahim",
      method: "shot in the apartment",
      motive: "coercive control and loss of authority",
      timeline: [
        "7:50 PM the daughter arrives to speak with family",
        "8:20 PM voices rise in the living room",
        "8:35 PM the shot is fired",
        "8:45 PM a neighbor calls authorities"
      ],
      planted_evidence: ["missing key", "unlocked balcony door"]
    },
    public_state: {
      victim_name: loc("Lina Sahar"),
      victim_role: loc("Community Organizer"),
      case_time: loc("8:35 PM"),
      case_location: loc("Uppsala family apartment"),
      case_briefing: loc(
        "You arrive at the Sahar apartment after Lina's fatal confrontation, with family members pulled into separate rooms. Mira has already spoken with social worker Eva about prior warnings, while Samir and cousin Nadia are comparing what they heard in the hallway. The family relationship is the center of the case, and everyone is protecting someone else. Eva is the closest ally with the documented history, and neighbor Oskar can anchor the timeline.",
        "Φτάνεις στο διαμέρισμα των Sahar μετά τη μοιραία σύγκρουση της Lina, με τα μέλη της οικογένειας σε ξεχωριστά δωμάτια. Η Mira έχει ήδη μιλήσει με την κοινωνική λειτουργό Eva για τις προηγούμενες προειδοποιήσεις, ενώ ο Samir και η ξαδέλφη Nadia συγκρίνουν όσα άκουσαν στο διάδρομο. Οι οικογενειακές σχέσεις είναι ο πυρήνας της υπόθεσης και όλοι προστατεύουν κάποιον. Η Eva είναι η πιο κοντινή σου σύμμαχος με τα καταγεγραμμένα στοιχεία, και ο γείτονας Oskar μπορεί να αγκυρώσει το χρονολόγιο."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("unlocked balcony door")],
      public_accusations: [],
      tensions: [loc("prior threats documented"), loc("family under scrutiny")]
    },
    characters: [
      {
        id: "rahim",
        name: "Rahim Sahar",
        role: loc("Father"),
        psycho: [
          loc("authoritarian"),
          loc("rigid"),
          loc("volatile"),
          loc("proud"),
          loc("controlling"),
          loc("defensive")
        ],
        goals: [loc("maintain authority"), loc("avoid conviction")],
        secrets: [loc("is the killer"), loc("kept a weapon in the house")],
        private_facts: {
          true_alibi: loc("in the living room at 8:35"),
          lie_alibi: loc("outside on the balcony"),
          motive: loc("felt his control slipping") ,
          suspicion_id: "samir",
          observation: {
            text: loc("The balcony door was left unlocked."),
            evidence: loc("unlocked balcony door")
          },
          leverage: loc("controls the family finances")
        },
        knowledge: [loc("Lina refused the family plan.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "mira",
        name: "Mira Sahar",
        role: loc("Mother"),
        psycho: [
          loc("anxious"),
          loc("protective"),
          loc("conflicted"),
          loc("quiet"),
          loc("tired"),
          loc("loyal")
        ],
        goals: [loc("protect the family"), loc("avoid public shame")],
        secrets: [loc("hid the spare key")],
        private_facts: {
          true_alibi: loc("in the kitchen at 8:30"),
          lie_alibi: loc("outside calling relatives"),
          motive: loc("none"),
          suspicion_id: "rahim",
          observation: {
            text: loc("Lina asked me to keep her phone."),
            evidence: loc("phone request")
          },
          leverage: loc("knows who called Lina back")
        },
        knowledge: [loc("There were threats written down before tonight.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "samir",
        name: "Samir Sahar",
        role: loc("Brother"),
        psycho: [
          loc("torn"),
          loc("defensive"),
          loc("angry"),
          loc("impatient"),
          loc("loyal"),
          loc("restless")
        ],
        goals: [loc("protect his parents"), loc("avoid blame")],
        secrets: [loc("argued with Lina on the stairwell")],
        private_facts: {
          true_alibi: loc("on the stairwell at 8:20"),
          lie_alibi: loc("at the store"),
          motive: loc("none"),
          suspicion_id: "rahim",
          observation: {
            text: loc("I heard the gun cabinet open."),
            evidence: loc("cabinet click")
          },
          leverage: loc("knows where the key was kept")
        },
        knowledge: [loc("Lina said she would not stay long.")],
        lie_strategy_tags: ["deny_where_when"]
      },
      {
        id: "nadia",
        name: "Nadia Sahar",
        role: loc("Cousin"),
        psycho: [
          loc("quiet"),
          loc("observant"),
          loc("shaken"),
          loc("empathetic"),
          loc("guarded"),
          loc("worried")
        ],
        goals: [loc("tell the truth"), loc("avoid family backlash")],
        secrets: [loc("saw Lina enter alone")],
        private_facts: {
          true_alibi: loc("in the hallway at 8:10"),
          lie_alibi: loc("waiting in the car"),
          motive: loc("none"),
          suspicion_id: "samir",
          observation: {
            text: loc("The front door lock was freshly scratched."),
            evidence: loc("scratched lock")
          },
          leverage: loc("has text messages from Lina")
        },
        knowledge: [loc("Lina said she felt safe coming tonight.")],
        lie_strategy_tags: []
      },
      {
        id: "eva",
        name: "Eva Lind",
        role: loc("Social Worker"),
        psycho: [
          loc("calm"),
          loc("direct"),
          loc("experienced"),
          loc("focused"),
          loc("empathetic"),
          loc("steady")
        ],
        goals: [loc("share prior reports"), loc("protect the record")],
        secrets: [loc("filed a warning about the family")],
        private_facts: {
          true_alibi: loc("writing a report at 8:30"),
          lie_alibi: loc("at dinner"),
          motive: loc("none"),
          suspicion_id: "rahim",
          observation: {
            text: loc("Lina told me she feared a confrontation."),
            evidence: loc("prior warning")
          },
          leverage: loc("has archived reports")
        },
        knowledge: [loc("There were repeated requests for protection.")],
        lie_strategy_tags: []
      },
      {
        id: "oskar",
        name: "Oskar Holm",
        role: loc("Neighbor"),
        psycho: [
          loc("curious"),
          loc("alert"),
          loc("nervous"),
          loc("helpful"),
          loc("plainspoken"),
          loc("shaken")
        ],
        goals: [loc("help authorities"), loc("stay out of conflict")],
        secrets: [loc("heard a single loud argument")],
        private_facts: {
          true_alibi: loc("in the hallway at 8:35"),
          lie_alibi: loc("asleep"),
          motive: loc("none"),
          suspicion_id: "rahim",
          observation: {
            text: loc("I heard a door slam right before the shot."),
            evidence: loc("door slam")
          },
          leverage: loc("knows who was on the staircase")
        },
        knowledge: [loc("The argument ended abruptly.")],
        lie_strategy_tags: []
      }
    ]
  },
  {
    id: "kyoto-2013",
    title: loc("The Beneficiary"),
    subtitle: loc("Kyoto  -  2013"),
    headline: loc("A string of sudden deaths raises questions."),
    synopsis: loc("A pattern emerges when insurance files and dating records align."),
    plot: loc(
      "A wealthy retiree dies suddenly after a short relationship. Investigators notice similar cases linked to the same matchmaker, raising the question of a deliberate pattern."
    ),
    solution: loc(
      "The matchmaker used poisoned drinks to kill for insurance payouts, masking her pattern through quick marriages and careful alibis."
    ),
    truth: {
      killer_id: "chisa",
      method: "poisoned drink",
      motive: "insurance payouts and financial gain",
      timeline: [
        "6:30 PM the couple meets for dinner",
        "7:00 PM the victim drinks the tea",
        "7:20 PM the victim collapses",
        "7:45 PM emergency services arrive"
      ],
      planted_evidence: ["altered insurance form", "unwashed teacup"]
    },
    public_state: {
      victim_name: loc("Kenji Watan"),
      victim_role: loc("Retired Executive"),
      case_time: loc("7:20 PM"),
      case_location: loc("Kyoto riverside condo"),
      case_briefing: loc(
        "You arrive at Kenji Watan's riverside condo just as the sudden death is being classified. Matchmaker Chisa is keeping close to colleague Miki, while Miki has already compared notes with insurance agent Koji about unusual beneficiaries and Emi has been pressing Dr. Hayashi for answers. The relationships look recent but the paperwork points to a longer pattern. Emi is the closest to you, and the medical examiner can steady the facts.",
        "Φτάνεις στο παραποτάμιο διαμέρισμα του Kenji Watan τη στιγμή που ο αιφνίδιος θάνατος καταγράφεται επίσημα. Η προξενήτρα Chisa μένει δίπλα στη συνάδελφο Miki, ενώ η Miki έχει ήδη συγκρίνει σημειώσεις με τον ασφαλιστικό πράκτορα Koji για ασυνήθιστους δικαιούχους και η Emi πιέζει τον Δρ. Hayashi για απαντήσεις. Οι σχέσεις φαίνονται πρόσφατες, αλλά τα έγγραφα δείχνουν μακρύτερο μοτίβο. Η Emi είναι η πιο κοντινή σου πηγή και ο ιατροδικαστής μπορεί να σταθεροποιήσει τα γεγονότα."
      ),
      case_briefing_source: "library",
      time_minutes: 0,
      discovered_evidence: [loc("unwashed teacup")],
      public_accusations: [],
      tensions: [loc("insurance investigators involved"), loc("pattern of deaths emerging")]
    },
    characters: [
      {
        id: "chisa",
        name: "Chisa Kuroda",
        role: loc("Matchmaker"),
        psycho: [
          loc("charming"),
          loc("calculating"),
          loc("patient"),
          loc("secretive"),
          loc("composed"),
          loc("observant")
        ],
        goals: [loc("hide the pattern"), loc("secure the payout")],
        secrets: [loc("is the killer"), loc("forged beneficiary forms")],
        private_facts: {
          true_alibi: loc("in the condo at 7:20"),
          lie_alibi: loc("stepping out for tea"),
          motive: loc("wanted the insurance payout") ,
          suspicion_id: "miki",
          observation: {
            text: loc("Kenji asked about a life policy during dinner."),
            evidence: loc("life policy mention")
          },
          leverage: loc("has access to client files")
        },
        knowledge: [loc("The victim signed documents last week.")],
        lie_strategy_tags: ["deny_where_when", "deny_timing"]
      },
      {
        id: "miki",
        name: "Miki Sato",
        role: loc("Matchmaking Colleague"),
        psycho: [
          loc("curious"),
          loc("talkative"),
          loc("observant"),
          loc("anxious"),
          loc("ethical"),
          loc("restless")
        ],
        goals: [loc("clear the agency"), loc("share suspicious records")],
        secrets: [loc("noticed repeated beneficiaries")],
        private_facts: {
          true_alibi: loc("at the office at 7:00"),
          lie_alibi: loc("out with clients") ,
          motive: loc("none"),
          suspicion_id: "chisa",
          observation: {
            text: loc("Several clients listed the same beneficiary."),
            evidence: loc("beneficiary pattern")
          },
          leverage: loc("controls access to dating logs")
        },
        knowledge: [loc("Chisa handled the most lucrative clients.")],
        lie_strategy_tags: []
      },
      {
        id: "daisuke",
        name: "Daisuke Mori",
        role: loc("Financial Advisor"),
        psycho: [
          loc("precise"),
          loc("guarded"),
          loc("methodical"),
          loc("cautious"),
          loc("stern"),
          loc("detail-focused")
        ],
        goals: [loc("explain the policy"), loc("avoid liability")],
        secrets: [loc("approved the policy quickly")],
        private_facts: {
          true_alibi: loc("in a meeting at 6:50"),
          lie_alibi: loc("at the condo"),
          motive: loc("none"),
          suspicion_id: "chisa",
          observation: {
            text: loc("The policy was signed during a rushed visit."),
            evidence: loc("rushed signature")
          },
          leverage: loc("has the insurance paperwork")
        },
        knowledge: [loc("Kenji asked about changing beneficiaries.")],
        lie_strategy_tags: ["deflect_mistakes"]
      },
      {
        id: "emi",
        name: "Emi Kuroda",
        role: loc("Victim's Daughter"),
        psycho: [
          loc("grieving"),
          loc("suspicious"),
          loc("persistent"),
          loc("angry"),
          loc("sharp"),
          loc("protective")
        ],
        goals: [loc("find the truth"), loc("protect the estate")],
        secrets: [loc("argued with her father about the relationship")],
        private_facts: {
          true_alibi: loc("on a train at 7:20"),
          lie_alibi: loc("at the condo"),
          motive: loc("none"),
          suspicion_id: "chisa",
          observation: {
            text: loc("The teacup was rinsed but not washed."),
            evidence: loc("teacup residue")
          },
          leverage: loc("can freeze the estate accounts")
        },
        knowledge: [loc("Her father signed papers without telling her.")],
        lie_strategy_tags: []
      },
      {
        id: "dr_hayashi",
        name: "Dr. Hayashi",
        role: loc("Medical Examiner"),
        psycho: [
          loc("clinical"),
          loc("calm"),
          loc("precise"),
          loc("direct"),
          loc("detached"),
          loc("methodical")
        ],
        goals: [loc("share findings"), loc("avoid speculation")],
        secrets: [loc("suspects poisoning")],
        private_facts: {
          true_alibi: loc("at the lab at 8:30"),
          lie_alibi: loc("at the scene"),
          motive: loc("none"),
          suspicion_id: "chisa",
          observation: {
            text: loc("The victim's symptoms were inconsistent with a heart attack."),
            evidence: loc("toxin indicators")
          },
          leverage: loc("controls toxicology results")
        },
        knowledge: [loc("The timeline matches a fast-acting toxin.")],
        lie_strategy_tags: []
      },
      {
        id: "koji",
        name: "Koji Tan",
        role: loc("Insurance Agent"),
        psycho: [
          loc("practical"),
          loc("wary"),
          loc("detail-focused"),
          loc("defensive"),
          loc("professional"),
          loc("guarded")
        ],
        goals: [loc("protect the insurer"), loc("explain the claims")],
        secrets: [loc("flagged the policy as unusual")],
        private_facts: {
          true_alibi: loc("reviewing claims at 7:30"),
          lie_alibi: loc("meeting the victim"),
          motive: loc("none"),
          suspicion_id: "daisuke",
          observation: {
            text: loc("The beneficiary change was unusually quick."),
            evidence: loc("fast change")
          },
          leverage: loc("can delay the payout")
        },
        knowledge: [loc("There were similar claims within five years.")],
        lie_strategy_tags: ["deflect_mistakes"]
      }
    ]
  }
];

function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function getDefaultCase() {
  return CASE_LIBRARY[0];
}

export function getCaseById(id) {
  if (!id) return getDefaultCase();
  return CASE_LIBRARY.find((entry) => entry.id === id) || getDefaultCase();
}

export function getCaseList(lang) {
  const language = normalizeLanguage(lang);
  return CASE_LIBRARY.map((entry) => ({
    id: entry.id,
    title: getLocalized(entry.title, language),
    subtitle: getLocalized(entry.subtitle, language),
    headline: getLocalized(entry.headline, language),
    synopsis: getLocalized(entry.synopsis, language)
  }));
}

export function createStateFromCase(caseData) {
  const data = deepClone(caseData);
  const characters = (data.characters || []).map((character) => ({
    ...character,
    knowledge: Array.isArray(character.knowledge) ? character.knowledge : [],
    memory: normalizeMemory(character.memory || createDefaultMemory())
  }));
  return {
    case_id: data.id,
    truth: data.truth,
    public_state: {
      ...data.public_state,
      case_title: data.title,
      case_subtitle: data.subtitle,
      case_headline: data.headline,
      case_synopsis: data.synopsis,
      case_briefing_source: data.public_state?.case_briefing_source || "library"
    },
    characters,
    events: [],
    detective_knowledge: []
  };
}

export { CASE_LIBRARY };
