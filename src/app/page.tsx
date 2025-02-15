'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';

interface IndexCard {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  zIndex: number;
  lines: number;
  lineColor: string;
  cardType: string;
}

const LINE_HEIGHT = 28;
const MIN_CARD_WIDTH = 300;
const MIN_CARD_HEIGHT = 200;
const LINE_SPACING = 28;

export default function InfiniteBoard() {
  const [cards, setCards] = useState<IndexCard[]>([]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const maxZIndex = useRef(1);

  // Transformation utilities
  const screenToBoard = (x: number, y: number) => {
    return {
      x: (x - offset.x) / scale,
      y: (y - offset.y) / scale,
    };
  };

  const boardToScreen = (x: number, y: number) => {
    return {
      x: x * scale + offset.x,
      y: y * scale + offset.y,
    };
  };

  // Card creation
  const createNewCard = (color: string, letter: string) => {
    const newCard: IndexCard = {
      id: Math.random().toString(36).slice(2, 9),
      x: -offset.x / scale + 100,
      y: -offset.y / scale + 100,
      width: MIN_CARD_WIDTH,
      height: MIN_CARD_HEIGHT,
      content: '',
      zIndex: maxZIndex.current + 1,
      cardType: letter,
      lineColor: color,
      lines: Math.floor(MIN_CARD_HEIGHT / LINE_HEIGHT),
    };
    maxZIndex.current += 1;
    return newCard;
  };

  // Dynamic textarea height
  const updateCardHeight = useDebouncedCallback((id: string, content: string) => {
    const lines = content.split('\n').length || 1;
    const newHeight = Math.max(MIN_CARD_HEIGHT, lines * LINE_HEIGHT + 60);
    
    setCards(prev => prev.map(card => {
      if (card.id === id) {
        return {
          ...card,
          height: newHeight,
          lines: Math.floor((newHeight - 60) / LINE_SPACING),
          content,
        };
      }
      return card;
    }));
  }, 100);

  // Drag handling
  const handleCardMouseDown = (id: string, e: React.MouseEvent) => {
    setDraggingId(id);
    const boardPos = screenToBoard(e.clientX, e.clientY);
    const card = cards.find(c => c.id === id)!;
    
    setLastMousePos({
      x: boardPos.x - card.x,
      y: boardPos.y - card.y,
    });
    
    maxZIndex.current += 1;
    setCards(prev => prev.map(card => 
      card.id === id ? { ...card, zIndex: maxZIndex.current } : card
    ));
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning && boardRef.current) {
      const dx = e.movementX;
      const dy = e.movementY;
      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    } else if (draggingId) {
      const boardPos = screenToBoard(e.clientX, e.clientY);
      setCards(prev => prev.map(card => {
        if (card.id === draggingId) {
          return {
            ...card,
            x: boardPos.x - lastMousePos.x,
            y: boardPos.y - lastMousePos.y,
          };
        }
        return card;
      }));
    }
  }, [isPanning, draggingId, lastMousePos]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001; // Increased sensitivity
    const newScale = Math.min(Math.max(0.1, scale + delta), 4);
  
    const rect = boardRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
  
    const newOffset = {
      x: mouseX - (mouseX - offset.x) * (newScale / scale),
      y: mouseY - (mouseY - offset.y) * (newScale / scale),
    };
  
    setScale(newScale);
    setOffset(newOffset);
  }, [scale, offset]); // Add scale and offset as dependencies
  
  // Update useEffect dependencies to include handleWheel
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => {
      setIsPanning(false);
      setDraggingId(null);
    });
    const board = boardRef.current;
    board?.addEventListener('wheel', handleWheel, { passive: false });
  
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', () => setIsPanning(false));
      board?.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseMove, handleWheel]); // Add handleWheel to dependencies

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card')) return;
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  // Effects
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => {
      setIsPanning(false);
      setDraggingId(null);
    });
    boardRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', () => setIsPanning(false));
      boardRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseMove]);

  return (
    <div 
      ref={boardRef}
      className="relative w-full h-screen bg-gray-100 overflow-hidden cursor-grab"
      onMouseDown={handleMouseDown}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      {/* Controls */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => setCards([...cards, createNewCard('A2D2DF', 'N')])}
          className="bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          Add Neighborhood +
        </button>
        <button
          onClick={() => setCards([...cards, createNewCard('F6EFBD', 'L')])}
          className="bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          Add Landmark +
        </button>
        <button
          onClick={() => setCards([...cards, createNewCard('BC7C7C', 'R')])}
          className="bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          Add Resident +
        </button>
        <div className="bg-white px-4 py-2 rounded-lg shadow-md">
          Zoom: {(scale * 100).toFixed(0)}%
        </div>
      </div>

      {/* Board */}
      <div
        className="relative origin-top-left will-change-transform"
        style={{
          transform: `matrix(${scale}, 0, 0, ${scale}, ${offset.x}, ${offset.y})`,
        }}
      >
        {cards.map(card => (
          <div
            key={card.id}
            className="absolute card select-none"
            style={{
              transform: `translate3d(${card.x}px, ${card.y}px, 0)`,
              width: `${card.width}px`,
              height: `${card.height}px`,
              zIndex: card.zIndex,
            }}
            onMouseDown={(e) => handleCardMouseDown(card.id, e)}
          >
            <div className="h-full w-full bg-white rounded-sm shadow-xl transition-all duration-200 hover:shadow-2xl">
              <div 
                className="h-full w-full p-8 relative"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #${card.lineColor} 0%, #${card.lineColor} 2%, transparent 2%),
                    repeating-linear-gradient(
                      to bottom,
                      #3b82f6 0px,
                      #3b82f6 1px,
                      transparent 1px,
                      transparent ${LINE_SPACING}px
                    )
                  `,
                  backgroundSize: `100% 40px, 100% ${LINE_SPACING}px`,
                  backgroundPosition: '0 40px',
                }}
              >
                <textarea
                  className="w-full h-full bg-transparent resize-none outline-none font-mono text-gray-800 text-lg pl-12 pt-10 leading-7"
                  style={{ 
                    background: 'transparent',
                    lineHeight: `${LINE_SPACING}px`,
                  }}
                  defaultValue={card.content}
                  onChange={(e) => updateCardHeight(card.id, e.target.value)}
                  placeholder="Start typing..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global Styles */}
      <style jsx global>{`
        .card {
          transition: transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }

        textarea {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }

        textarea::-webkit-scrollbar {
          width: 8px;
        }

        textarea::-webkit-scrollbar-track {
          background: transparent;
        }

        textarea::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }

        textarea:focus {
          outline: none;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}