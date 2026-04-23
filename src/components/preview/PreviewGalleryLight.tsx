// src/components/preview/PreviewGalleryLight.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  RotateCw,
  Maximize,
} from "lucide-react";
import "@/styles/preview-gallery-light.css";
import downloadService from "@/services/downloadService";

export type LGItem = {
  id: string | number;
  thumbUrl: string;
  fileUrl: string;
  isPdf?: boolean;
  title?: string;
};

interface PreviewGalleryLightProps {
  items: LGItem[];
  startIndex?: number;
  open: boolean;
  onClose: () => void;
}

export default function PreviewGalleryLight({
  items,
  startIndex = 0,
  open,
  onClose,
}: PreviewGalleryLightProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFitToScreen, setIsFitToScreen] = useState(true);

  // PDF states
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [currentPdfPage, setCurrentPdfPage] = useState(0);

  const currentItem = items[currentIndex];
  const isPdf =
    currentItem?.isPdf ?? currentItem?.fileUrl.toLowerCase().endsWith(".pdf");

  // Load PDF and extract pages
  useEffect(() => {
    if (!isPdf || !open) {
      setPdfPages([]);
      setCurrentPdfPage(0);
      setPdfError(false);
      return;
    }

    const loadPdf = async () => {
      setPdfLoading(true);
      setPdfError(false);
      
      try {
        // Dynamically import pdfjs
        const pdfjsLib = await import("pdfjs-dist");

        // Set worker to local file
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

        // Configure PDF loading with proper headers
        const loadingTask = pdfjsLib.getDocument({
          url: currentItem.fileUrl,
          withCredentials: false,
          isEvalSupported: false,
          httpHeaders: {
            'Accept': 'application/pdf',
          },
        });

        const pdf = await loadingTask.promise;

        const pages: string[] = [];

        // Extract all pages as images
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.5 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvas,
            viewport,
          }).promise;

          const imageData = canvas.toDataURL("image/png");
          pages.push(imageData);
        }

        setPdfPages(pages);
        setCurrentPdfPage(0);
        setPdfLoading(false);
      } catch (error) {
        console.error("Error loading PDF:", error);
        setPdfError(true);
        setPdfLoading(false);
      }
    };

    loadPdf();
  }, [isPdf, currentItem?.fileUrl, open]);

  // Reset on index change
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsFitToScreen(true);
    setCurrentPdfPage(0);
  }, [currentIndex]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose();
        }
      }

      // If PDF with multiple pages, arrow keys navigate pages
      if (isPdf && pdfPages.length > 1) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          handlePrevPdfPage();
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          handleNextPdfPage();
        }
      } else {
        if (e.key === "ArrowLeft") handlePrev();
        if (e.key === "ArrowRight") handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, isFullscreen, isPdf, pdfPages.length, currentPdfPage]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const handlePrevPdfPage = () => {
    if (currentPdfPage > 0) {
      setCurrentPdfPage((prev) => prev - 1);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsFitToScreen(true);
    }
  };

  const handleNextPdfPage = () => {
    if (currentPdfPage < pdfPages.length - 1) {
      setCurrentPdfPage((prev) => prev + 1);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsFitToScreen(true);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 5));
    setIsFitToScreen(false);
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
    if (zoom <= 1) {
      setIsFitToScreen(true);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleFitToScreen = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsFitToScreen(true);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // const handleDownload = () => {
  //   const link = document.createElement("a");
  //   link.href = currentItem.fileUrl;
  //   link.download = currentItem.title || "download";
  //   link.target = "_blank";
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };


  // const handleDownload = async () => {
  //   try {
  //     const urlParts = currentItem.fileUrl.split('/');
  //     const originalFilename = urlParts[urlParts.length - 1].split('?')[0];
  //     const extension = originalFilename.split('.').pop();
      
  //     const filename = currentItem.title 
  //       ? `${currentItem.title}.${extension}` 
  //       : originalFilename;

  //     // ✅ Conditional download based on file type
  //     if (isPdf) {
  //       // PDF - Direct download (no backend proxy)
  //       const link = document.createElement("a");
  //       link.href = currentItem.fileUrl;
  //       link.download = currentItem.title || "document.pdf";
  //       link.target = "_blank";               
  //       document.body.appendChild(link);
  //       link.click();
  //       document.body.removeChild(link);
  //     } else {
  //       // Images - Backend proxy for CORS
  //       await downloadService.downloadFile(currentItem.fileUrl, filename);
  //     }
      
  //   } catch (error) {
  //     console.error("Download failed:", error);
  //     // Fallback: open in new tab
  //     window.open(currentItem.fileUrl, '_blank');
  //   }
  // };

  const handleDownload = async () => {
    try {
      const urlParts = currentItem.fileUrl.split('/');
      const originalFilename = urlParts[urlParts.length - 1].split('?')[0];
      const extension = originalFilename.split('.').pop();
      
      const filename = currentItem.title 
        ? `${currentItem.title}.${extension}` 
        : originalFilename;

      // ✅ Both images and PDFs use backend proxy
      await downloadService.downloadFile(currentItem.fileUrl, filename);
      
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(currentItem.fileUrl, '_blank');
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom((prev) => {
      const newZoom = Math.max(0.5, Math.min(5, prev + delta));
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
        setIsFitToScreen(true);
      } else {
        setIsFitToScreen(false);
      }
      return newZoom;
    });
  }, []);

  // Double click to zoom
  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      setZoom(2);
      setIsFitToScreen(false);
    } else {
      handleFitToScreen();
    }
  }, [zoom]);

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || zoom <= 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Pinch zoom
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);

  const getPinchDistance = (touches: React.TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handlePinchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setInitialPinchDistance(getPinchDistance(e.touches));
      setInitialZoom(zoom);
    }
  };

  const handlePinchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      const currentDistance = getPinchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.5, Math.min(5, initialZoom * scale));
      setZoom(newZoom);
      if (newZoom > 1) {
        setIsFitToScreen(false);
      }
    }
  };

  const handlePinchEnd = () => {
    setInitialPinchDistance(null);
  };

  if (!open) return null;

  const displayImage =
    isPdf && pdfPages.length > 0 ? pdfPages[currentPdfPage] : currentItem?.fileUrl;

  const showPdfNavigation = isPdf && pdfPages.length > 1;
  const showIframe = isPdf && (pdfError || pdfPages.length === 0) && !pdfLoading;

  return (
    <div className="custom-gallery-overlay">
      <div className="gallery-backdrop" onClick={onClose} />

      <div className="gallery-toolbar">
        <div className="toolbar-left">
          <span className="gallery-counter">
            {isPdf && pdfPages.length > 0 ? (
              <>Page {currentPdfPage + 1} / {pdfPages.length}</>
            ) : (
              <>{currentIndex + 1} / {items.length}</>
            )}
          </span>
          {currentItem?.title && (
            <span className="gallery-title">{currentItem.title}</span>
          )}
        </div>

        <div className="toolbar-right">
          {!showIframe && (
            <>
              <button
                className="toolbar-btn"
                onClick={handleZoomOut}
                title="Zoom Out"
                disabled={zoom <= 0.5}
              >
                <ZoomOut size={20} />
              </button>
              <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
              <button
                className="toolbar-btn"
                onClick={handleZoomIn}
                title="Zoom In"
                disabled={zoom >= 5}
              >
                <ZoomIn size={20} />
              </button>
              <button
                className="toolbar-btn"
                onClick={handleFitToScreen}
                title="Fit to Screen"
                disabled={isFitToScreen && zoom === 1}
              >
                <Maximize size={20} />
              </button>
              <button className="toolbar-btn" onClick={handleRotate} title="Rotate">
                <RotateCw size={20} />
              </button>
            </>
          )}
          <button
            className="toolbar-btn"
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button className="toolbar-btn" onClick={handleDownload} title="Download">
            <Download size={20} />
          </button>
          <button
            className="toolbar-btn toolbar-btn-close"
            onClick={onClose}
            title="Close"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      <div className="gallery-content">
        {(showPdfNavigation || (items.length > 1 && !showIframe)) && (
          <>
            <button
              className="gallery-nav gallery-nav-prev"
              onClick={showPdfNavigation ? handlePrevPdfPage : handlePrev}
              disabled={showPdfNavigation && currentPdfPage === 0}
            >
              <ChevronLeft size={32} />
            </button>
            <button
              className="gallery-nav gallery-nav-next"
              onClick={showPdfNavigation ? handleNextPdfPage : handleNext}
              disabled={showPdfNavigation && currentPdfPage === pdfPages.length - 1}
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}

        <div
          className="gallery-image-container"
          onWheel={!showIframe ? handleWheel : undefined}
          onMouseDown={!showIframe ? handleMouseDown : undefined}
          onMouseMove={!showIframe ? handleMouseMove : undefined}
          onMouseUp={!showIframe ? handleMouseUp : undefined}
          onMouseLeave={!showIframe ? handleMouseUp : undefined}
          onTouchStart={
            !showIframe
              ? (e) => {
                  if (e.touches.length === 2) {
                    handlePinchStart(e);
                  } else {
                    handleTouchStart(e);
                  }
                }
              : undefined
          }
          onTouchMove={
            !showIframe
              ? (e) => {
                  if (e.touches.length === 2) {
                    handlePinchMove(e);
                  } else {
                    handleTouchMove(e);
                  }
                }
              : undefined
          }
          onTouchEnd={
            !showIframe
              ? () => {
                  handleTouchEnd();
                  handlePinchEnd();
                }
              : undefined
          }
          onDoubleClick={!showIframe ? handleDoubleClick : undefined}
        >
          {pdfLoading ? (
            <div className="gallery-loading">
              <div className="loading-spinner"></div>
              <p>Loading PDF...</p>
            </div>
          ) : showIframe ? (
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(
                currentItem.fileUrl
              )}&embedded=true`}
              className="gallery-pdf"
              title={currentItem.title || "PDF"}
            />
          ) : (
            <img
              src={displayImage}
              alt={currentItem?.title || ""}
              className={`gallery-image ${isFitToScreen ? "gallery-image-fit" : ""}`}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${
                  position.x / zoom
                }px, ${position.y / zoom}px)`,
                cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
              }}
              draggable={false}
            />
          )}
        </div>
      </div>

      {items.length > 1 && !showPdfNavigation && !showIframe && (
        <div className="gallery-thumbnails">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`gallery-thumb ${
                index === currentIndex ? "gallery-thumb-active" : ""
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <img src={item.thumbUrl} alt={item.title || ""} />
              {item.isPdf && <span className="thumb-pdf-badge">PDF</span>}
            </div>
          ))}
        </div>
      )}

      {showPdfNavigation && (
        <div className="gallery-thumbnails">
          {pdfPages.map((pageImage, index) => (
            <div
              key={`pdf-page-${index}`}
              className={`gallery-thumb ${
                index === currentPdfPage ? "gallery-thumb-active" : ""
              }`}
              onClick={() => {
                setCurrentPdfPage(index);
                setZoom(1);
                setPosition({ x: 0, y: 0 });
                setIsFitToScreen(true);
              }}
            >
              <img src={pageImage} alt={`Page ${index + 1}`} />
              <span className="thumb-page-number">{index + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}