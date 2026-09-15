# Bomberman DOM

[Bomberman Game]

A multiplayer Bomberman game built using vanilla JavaScript and WebSockets, without canvas or WebGL. This project implements a classic Bomberman-style game where 2–4 players can battle until one remains standing.

## 🎮 Game Features

- **Multiplayer**: 2–4 players can join and play together in real-time  
- **WebSocket Communication**: Real-time game state updates and chat functionality  
- **Custom Mini Framework**: Built on top of my [Mini-Framework](https://github.com/aminehabchi/mini-framework) project  
- **Room System**: Create private rooms or join random ones  
- **Power-ups**: Collect items to increase bombs, explosion range, and speed  
- **Responsive Design**: Fully responsive game interface that works across devices  

## 🕹️ How to Play

### Game Controls

- **Movement**: Arrow keys (↑, ↓, ←, →)  
- **Place Bomb**: `x`  

### Game Rules

- Each player starts with 3 lives  
- Players are placed in the corners of the map  
- Destroy blocks to find power-ups:
  - **Bombs**: Increases the number of bombs you can place simultaneously  
  - **Flames**: Increases explosion range in all four directions  
  - **Speed**: Increases your movement speed  
- Last player standing wins!  

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+ recommended)  
- (Optional) Docker installed  



### Installation (With Docker)

1. Build the Docker image:

   ```bash
   docker build -t bomberman-app .
   ```

2. Run the container:

   ```bash
   docker run -p 3000:3000 bomberman-app
   ```

3. Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
.
├── Dockerfile
├── server
│   ├── bomb            # Bomb logic and explosion handling
│   ├── controllers     # Game controllers
│   ├── moduls          # Core server modules
│   ├── movement        # Player movement logic
│   ├── routes          # API routes
│   └── service         # Game services
└── web
    ├── bomberman
    │   ├── assets      # Game assets (sprites, sounds)
    │   │   ├── player
    │   │   └── powers
    │   ├── components  # Game components
    │   ├── gameLoop    # Main game loop
    │   ├── socket      # WebSocket client implementation
    │   ├── styles      # CSS styles
    │   └── utils       # Utility functions
    └── framework1      # Mini-framework
```

## 🛠️ Technical Implementation

### Performance Optimization

- Game runs at 60+ FPS at all times  
- Efficient use of `requestAnimationFrame`  
- Optimized DOM manipulation  
- Performance monitoring and metrics  

### Mini-Framework

This project is built on top of my custom mini-framework (`web/framework1`) which provides:

- Component-based architecture with `onMount` / `onUpdate` / `onUnmount` lifecycle hooks  
- A keyed virtual DOM that patches only the nodes that actually changed  
- A single observable store, with renders batched into one animation frame  
- A delegated event system (`onClick`, `onKeyUp`, …) dispatched from one root listener per event type  
- A hash-based router, so the game's routes are `#/`, `#/start`, `#/chat` and `#/game`  

### Multiplayer Implementation

- WebSocket server for real-time communication  
- Game state synchronization  
- Room management for multiple concurrent games  
- Chat functionality
