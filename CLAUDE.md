# Mario Kart Racing Game – Project Guide

## Overview
Browser-based Mario Kart-style racing game with dynamic city themes (Berlin, Amsterdam, Vilnius, Vinted).

## Tech Stack
- JavaScript (ES6+)
- Three.js for 3D rendering
- Vite for bundling & dev server
- Web Audio API for sound
- Vercel for deployment

## Game Mechanics
- 2.5-minute race, 4 racers (1 player + 3 AI)
- WASD controls with drifting (Mario Kart-style)
- 4 power-up categories: speed boost, theme swap, mode swap (good/bad), slow-motion
- Mario Kart points: 1st=10pts, 2nd=6pts, 3rd=3pts, 4th=1pt
- Theme swap = visuals only, track path constant
- All transformations visible to all racers simultaneously

## File Structure
```
/src
  main.js          → entry point
  game.js          → game loop & state manager
  track.js         → track geometry & collision
  racer.js         → player + AI racer class
  powerups.js      → 4 power-up types
  ai.js            → AI pathfinding & attacks
  ui.js            → HUD, results screen, leaderboard
  audio.js         → music & sound effects
  themes.js        → Berlin, Amsterdam, Vilnius, Vinted data
  config.js        → power-up positions, tuning params
/public            → static assets (empty for MVP)
```

## Build & Deploy
- `npm run dev` → local dev server (localhost:5173)
- `npm run build` → production build to /dist
- Git + GitHub for version control
- Vercel for deployment

## Commit After Each Phase
- Phase 3A: Core racing (track, movement, AI, timer)
- Phase 3B: Drifting mechanics
- Phase 3C: Power-ups (4 types)
- Phase 3D: AI attacks
- Phase 3E: Leaderboard & points
- Phase 3F: Polish & audio

## Notes
- Keep AI speed capped at 80% of player max
- Fixed power-up locations (no random spawning MVP)
- Default theme: Berlin (Good mode)
- Test locally before each commit

## Shape Building Guide

### Pretzel
- Use 4 torus shapes positioned to form a twisted loop
- Torus 1: Top curve (rotated 45°)
- Torus 2: Left twist (rotated 90°)
- Torus 3: Right twist (rotated 270°)
- Torus 4: Bottom curve (rotated 180°)
- Color: tan/brown (0xD2B48C)
- Scale: 1.5 units
- Combine with group to position correctly

### High Heel Shoe (Ladies Stiletto)
- Main body: Stretched box for shoe base (red or pink)
- Heel: Thin cylinder positioned at back (tall, thin, 0.1 unit diameter)
- Toe: Slightly tapered forward
- Height: 1.2 units overall
- Color: hot pink or red (0xFF1493)
