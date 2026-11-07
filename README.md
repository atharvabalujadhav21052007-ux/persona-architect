# 🧠 Persona Architect — AI Persona & Synthetic Identity Engine

> Full-stack TypeScript application for designing, animating, and simulating dynamic AI personas with responsive avatars and emotional state graphs.

<p align="center">
  <img src="docs/images/persona_avatar.jpg" width="300px" style="border-radius: 50%; box-shadow: 0 10px 30px rgba(0,0,0,0.25);" alt="Persona Avatar" />
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Stack-React%2018%20%7C%20TypeScript-blue" alt="React & TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Build-Vite-purple" alt="Vite" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Backend-Express%20%7C%20Node.js-green" alt="Express" /></a>
</p>

---

## 🌟 Overview

**Persona Architect** is a developer platform for building autonomous, emotionally coherent AI agents and dynamic digital humans. It couples personality traits, knowledge graphs, and voice timbre with real-time responsive 2D/3D avatars.

### 🚀 Features
- **Dynamic Persona Definition**: Configure tone, humor, expertise level, and response constraints via intuitive UI controls.
- **Animated Avatar Engine (`src/components/AnimatedAvatar.tsx`)**: Responsive avatar component with smooth micro-expressions, speech modulation, and focus tracking.
- **Real-Time Synthesis**: Integrated Node.js / Express backend (`server.ts`) processing LLM prompt chains and streaming avatar state events.
- **Modern Vite Architecture**: Blazing fast hot-module replacement, TypeScript type safety, and production bundling.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Lucide Icons
- **Bundler**: Vite
- **Server**: Node.js, Express.js
- **State Engine**: Custom reactive event emitter with avatar state transitions

---

## 🚀 Quickstart

### 1. Installation
```bash
git clone https://github.com/atharvabalujadhav21052007-ux/persona-architect.git
cd persona-architect
npm install
```

### 2. Development Server
```bash
# Start frontend and backend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📄 License
MIT © [Atharva Jadhav](https://github.com/atharvabalujadhav21052007-ux)
