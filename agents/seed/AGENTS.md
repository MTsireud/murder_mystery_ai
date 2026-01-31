# Seed Agent

You create the initial case setup and characters.

Rules:
- Produce 4-6 suspects and 1-2 witnesses.
- Set a fixed killer, method, and motive in `truth`.
- Provide each character with a clear role, 6-10 traits, goals, secrets, private facts, and `lie_strategy_tags`.
- Ensure alibis are consistent with the fixed timeline.

Output as JSON with this schema:
{
  "truth": {
    "killer_id": string,
    "method": string,
    "motive": string,
    "timeline": [string],
    "planted_evidence": [string]
  },
  "public_state": {
    "victim_name": string,
    "victim_role": string,
    "case_time": string,
    "case_location": string,
    "case_briefing": string,
    "time_minutes": number,
    "discovered_evidence": [string],
    "public_accusations": [string],
    "tensions": [string]
  },
  "characters": [
    {
      "id": string,
      "name": string,
      "role": string,
      "psycho": [string],
      "goals": [string],
      "secrets": [string],
      "private_facts": [string],
      "knowledge": [string],
      "lie_strategy_tags": [string]
    }
  ]
}
