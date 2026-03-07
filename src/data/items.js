// ── GAME ITEMS & EFFECTS ─────────────────────────────────────────────────────

export const CACHE_ITEMS = [
  { roll: 1, name: 'Herbs & Tonic',           desc: 'When EXPENDED, the model gains +3 VITALITY. Cannot exceed starting maximum VITALITY.' },
  { roll: 2, name: 'Food',                     desc: 'When EXPENDED, the model gains 1 additional action this activation. This does not allow them to repeat actions.' },
  { roll: 3, name: 'Scholarly Scroll',         desc: 'Anytime the model fails a SKILL Check, they may immediately EXPEND this to pass it instead.' },
  { roll: 4, name: 'Map',                      desc: 'When EXPENDED, every model in your Doom Company immediately moves: 3 alive = 2″ each; 2 alive = 3″ each; 1 alive = 4″.' },
  { roll: 5, name: 'Cloak',                    desc: 'When EXPENDED, the model may not be targeted by or make ATTACK or PUSH actions until their next activation.' },
  { roll: 6, name: 'Reliquary',               desc: 'When EXPENDED, the model regains one additional use of a "Once Per Game" ability.' },
]

export const STATUS_DEFS = [
  ['BREACHED', 'At the start of each activation, roll a SKILL Check. On a failure, lose 1 VITALITY — this ignores DEFENSE. Breached is permanent until removed by an ability.'],
  ['STUNNED', 'The model cannot take any actions until the end of their next activation.'],
  ['IMMOBILIZED', 'The model cannot move or climb until the end of their next activation.'],
  ['HINDERED', 'The model loses their next action. The status then clears.'],
  ['SUNDERED', "The model's weapon has -1 COMBAT for the rest of the game. Permanent."],
  ['SWARMED', 'The model suffers -1 to all COMBAT Checks while this status persists.'],
]

export const ACTION_DEFS = [
  ['MOVE', 'Move a model up to its movement value in inches.'],
  ['DASH', 'Move a model up to 2 inches.'],
  ['ATTACK', 'Attack with one equipped weapon or two equipped light melee weapons.'],
  ['PUSH', 'Move an enemy model in base contact with you 1 inch in any direction. If this model comes in contact with another model or a barrier, it stops. If that model comes in contact with an edge they could fall off of, or they were already in contact with a barrier against an edge before being pushed, they make a SKILL Check. If they fail the SKILL Check, they fall and roll for fall damage. If they succeed they stop short of falling.'],
  ['STANDBY', "The model readies an ATTACK with its weapon(s) and automatically performs that ATTACK action on the first enemy that carries out an action within your weapon(s) range. Your model's ATTACK happens after that enemy model has completed their current action. A model cannot use Standby if they used ATTACK this round. Standby lasts until the model's next activation."],
  ['EXPEND', 'Use a consumable item purchased during Doom Company creation or acquired from a cache. Expend does not cost an action, but may trigger actions that do.'],
  ['SCALE', 'The model scales the full distance/height of an unoccupied climbing item. They are then placed at the top as close as possible to the ladder or hook. The next action the model uses must be MOVE, DASH, or RETRIEVE CLIMBING GEAR. Until then, they are considered to be on the ladder or rope.'],
  ['CONCENTRATE', 'During the next COMBAT or SKILL Check you make during this activation, add +1 to the result.'],
  ['JUMP', "A model standing on an edge of a structure attempts to jump to another surface on the same or lower elevation that's a maximum of 3 inches away. The model performs a SKILL Check. If they pass, place them on the surface they jumped to. If they fail, they fall directly below the edge they were standing on and roll for falling damage."],
  ['HANDOFF', 'Transfer any consumable item or climbing item to another friendly model within one inch, or pick up an item off the ground left by a perished Doom Warrior.'],
  ['SCALE DOWN', 'The model scales down the full distance/height of an unoccupied climbing item. They are then placed at the bottom as close as possible to the ladder or hook. The model is no longer on the climbing item.'],
  ['SET LADDER', 'A model sets a ladder they have against a structure they are in base contact with. The structure can be a maximum of 4 inches high. Ladders can also be set between structures as an improvised bridge.'],
  ['SET GRAPPLING HOOK', 'A model makes a SKILL Check. If they pass, they hook their Grappling Hook to the top of a structure they are in base contact with. The structure can be a maximum of 6 inches high.'],
  ['RETRIEVE CLIMBING GEAR', 'A model picks up a climbing item they are in base contact with that has no models on it. Models must be at the top of a Grappling Hook to retrieve it, but can retrieve Ladders from the top or bottom.'],
  ['CLIMB', 'If a model is in base contact with a wall or structure greater than 1 inch but not greater than 3 inches tall, they may CLIMB it with a successful SKILL Check. Climbing distance is unaffected by environmental conditions. If you roll a 1 on your SKILL Check you fall the full length of the attempted climb and must roll on the falling table.'],
  ['INSPECT RESOURCE CACHE', 'The model makes a SKILL Check. If they pass, they reveal the contents of the resource cache. If they fail, the action ends. If a model fails to reveal the contents of a Cache and it is the second time a model has failed to do so, the Cache is destroyed. Remove the Cache from play.'],
  ['OPEN DOOR', 'A model makes a SKILL Check. If they succeed, they can open or close a door they are in base contact with. This skill can also open a portcullis, a trap door, a lock, or anything agreed upon prior to the start of a game.'],
  ['PIERCING BLOW', 'When a model rolls a 6 on a COMBAT Check, the hit ignores DEFENSE. The first time a model is hit by a Piercing Blow, they become Breached.'],
]
