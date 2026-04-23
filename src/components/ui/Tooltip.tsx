// src/components/ui/Tooltip.tsx
"use client";

import { useState, ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom"; // 👈 Import createPortal

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  offset?: number;
}

// 1. TooltipContent को अलग कंपोनेंट बनाते हैं, जो Portal के अंदर रेंडर होगा।
const TooltipContent = ({ text, position, offset, rect }: Omit<TooltipProps, 'children'> & { rect: DOMRect | null }) => {
  if (!rect) return null;

  const baseClasses = "fixed px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap z-[9999]"; // Use fixed and high z-index
  const arrowBase = "absolute border-4 border-transparent";
  const arrowSize = 4; // Arrow size for precise positioning

  // Position calculation based on the trigger element's rect
  let top = 0;
  let left = 0;
  let arrowClasses = "";
  
  const halfOffset = offset! / 2;

  switch (position) {
    case 'top':
      top = rect.top - halfOffset;
      left = rect.left + rect.width / 2;
      arrowClasses = `${arrowBase} top-full left-1/2 -translate-x-1/2 border-t-gray-800`;
      break;
    case 'bottom':
      top = rect.bottom + halfOffset;
      left = rect.left + rect.width / 2;
      arrowClasses = `${arrowBase} bottom-full left-1/2 -translate-x-1/2 border-b-gray-800`;
      break;
    case 'left':
      top = rect.top + rect.height / 2;
      left = rect.left - halfOffset;
      arrowClasses = `${arrowBase} left-full top-1/2 -translate-y-1/2 border-l-gray-800`;
      break;
    case 'right':
      top = rect.top + rect.height / 2;
      left = rect.right + halfOffset;
      arrowClasses = `${arrowBase} right-full top-1/2 -translate-y-1/2 border-r-gray-800`;
      break;
  }

  // Adjustments to position the tooltip container itself correctly
  let tooltipAdjustments = '';
  if (position === 'top') {
    tooltipAdjustments = `translate-y-[-100%] translate-x-[-50%]`;
  } else if (position === 'bottom') {
    tooltipAdjustments = `translate-x-[-50%]`;
  } else if (position === 'left') {
    tooltipAdjustments = `translate-x-[-100%] translate-y-[-50%]`;
  } else if (position === 'right') {
    tooltipAdjustments = `translate-y-[-50%]`;
  }

  const tooltipStyle = {
    top: `${top}px`,
    left: `${left}px`,
  };

  return (
    <div 
      className={`${baseClasses} ${tooltipAdjustments}`} 
      style={tooltipStyle}
    >
      {text}
      <div className={arrowClasses} style={{ 
          // Custom arrow placement fix for left/right translation
          ...(position === 'left' && { right: `-${arrowSize*2}px` }),
          ...(position === 'right' && { left: `-${arrowSize*2}px` }),
          ...(position === 'top' && { bottom: `-${arrowSize*2}px` }),
          ...(position === 'bottom' && { top: `-${arrowSize*2}px` }),
      }}/>
    </div>
  );
};


export default function Tooltip({
  children,
  text,
  position = "top",
  offset = 8
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false); // To handle SSR/Hydration

  // 2. Component mount होने पर rect (position) को calculate करें
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      // Get the bounding box of the trigger element
      setRect(triggerRef.current.getBoundingClientRect());
      setShow(true);
    }
  };

  const handleMouseLeave = () => {
    setShow(false);
    setRect(null);
  };
  
  // 3. Portal के बिना trigger element
  return (
    <div
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {/* 4. Portal को केवल client पर mount होने पर render करें */}
      {show && mounted && createPortal(
          <TooltipContent 
              text={text} 
              position={position} 
              offset={offset} 
              rect={rect} 
          />,
          document.body // Target: body
      )}
    </div>
  );
}