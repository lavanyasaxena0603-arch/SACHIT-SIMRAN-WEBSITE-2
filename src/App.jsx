import React, { useState, useEffect } from 'react';
import PalaceEntranceScene from './components/PalaceEntranceScene';
import RoyalCourtyardScene from './components/RoyalCourtyardScene';
import WeddingWelcomeScene from './components/WeddingWelcomeScene';
import MeetBrideGroomScene from './components/MeetBrideGroomScene';
import ScrollInvitationScene from './components/ScrollInvitationScene';

export default function App() {
  // Navigation mode: 
  // 1: Scene 1 (Palace Gate Entrance)
  // 2: Scene 2 (Royal Courtyard Video Reveal)
  // 3: Scene 3 (Cinematic Wedding Welcome Overlay)
  // 4: Continuous Scroll Story: Scene 4 (Meet Bride & Groom) seamlessly flowing into Scene 5 (Video Scroll Story)
  const [currentScene, setCurrentScene] = useState(1);
  const [isNight, setIsNight] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [currentScene]);

  const handleToggleNight = (nextNight) => {
    setIsNight(nextNight);
  };

  const sceneTitles = [
    { id: 1, name: 'Scene 1: Gate Entrance' },
    { id: 2, name: 'Scene 2: Courtyard Reveal' },
    { id: 3, name: 'Scene 3: Welcome Overlay' },
    { id: 4, name: 'Scene 4 & 5: Continuous Scroll Invitation' },
  ];

  return (
    <main className="w-full min-h-screen bg-[#040711] text-[#f7f2e7] selection:bg-[#d4af37]/30 selection:text-white">
      
      {/* =======================================================================
          SCENE 01: PALACE ENTRANCE GATE
          ======================================================================= */}
      {currentScene === 1 && (
        <PalaceEntranceScene 
          isNight={isNight}
          onToggleNight={handleToggleNight}
          onProceedToScene2={() => setCurrentScene(2)} 
        />
      )}

      {/* =======================================================================
          SCENE 02: THE GRAND ROYAL COURTYARD REVEAL
          ======================================================================= */}
      {currentScene === 2 && (
        <RoyalCourtyardScene 
          isNight={isNight}
          onToggleNight={handleToggleNight}
          onBackToScene1={() => setCurrentScene(1)}
          onSceneComplete={() => setCurrentScene(3)}
        />
      )}

      {/* =======================================================================
          SCENE 03: CINEMATIC WEDDING WELCOME SCREEN
          ======================================================================= */}
      {currentScene === 3 && (
        <WeddingWelcomeScene 
          isNight={isNight}
          onToggleNight={handleToggleNight}
          onBack={() => setCurrentScene(2)}
          onContinue={() => setCurrentScene(4)}
        />
      )}

      {/* =======================================================================
          SCENE 04 & 05: SEAMLESS SCROLLING INVITATION (PORTFOLIO STYLE)
          Scene 4 (Meet Bride & Groom) is completely visible at the top,
          and scrolling down continues directly into Scene 5 (Scroll Story on Video)
          ======================================================================= */}
      {currentScene === 4 && (
        <div className="relative w-full">
          
          {/* Section 4: Meet The Bride & Groom */}
          <MeetBrideGroomScene 
            isNight={isNight}
            onToggleNight={handleToggleNight}
            onBack={() => setCurrentScene(3)}
          />

          {/* Section 5: Real Video Scroll Story (animating line-by-line quote & petals) */}
          <ScrollInvitationScene 
            isNight={isNight}
            onToggleNight={handleToggleNight}
            onContinue={() => {
              console.log("Completed Scroll Story.");
            }}
          />

        </div>
      )}

      {/* =======================================================================
          FLOATING SCENE SWITCHER DOCK (BOTTOM CENTER)
          Allows 1-click preview of any scene or the full scrolling story
          ======================================================================= */}
      {import.meta.env.DEV && (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1 rounded-full bg-[#080d1a]/90 border border-[#d4af37]/50 shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        {sceneTitles.map((scene) => (
          <button
            key={scene.id}
            onClick={() => {
              setCurrentScene(scene.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-[10px] font-cinzel tracking-wider uppercase transition-all duration-300 ${
              currentScene === scene.id
                ? 'bg-gradient-to-r from-[#ba8c22] via-[#e5c56c] to-[#ba8c22] text-[#050814] font-bold shadow-md'
                : 'text-[#d4af37]/80 hover:text-white hover:bg-white/5'
            }`}
          >
            {scene.name.split(':')[0]}
          </button>
        ))}
      </div>
      )}

    </main>
  );
}
