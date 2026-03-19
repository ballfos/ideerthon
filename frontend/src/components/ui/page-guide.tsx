import { useGuide } from "#/features/guide/guide-context";
import { cn } from "#/utils/ui/cn";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface GuideStep {
    targetId: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface PageGuideProps {
    steps?: GuideStep[]; // Now optional as we use context
    onClose?: () => void;
}

export function PageGuide({ onClose, steps: propSteps }: PageGuideProps) {
    const { steps: contextSteps } = useGuide();
    const steps = propSteps ?? contextSteps;

    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({});
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const updateTargetRect = useCallback(() => {
        if (!isOpen || !steps[currentStep]) return;

        const step = steps[currentStep];
        const element = document.getElementById(step.targetId);

        if (element) {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);

            // Calculate bubble position
            const width = window.innerWidth;
            const height = window.innerHeight;
            const bubbleWidth = Math.min(320, width - 40);

            const isAbove = (rect.bottom + 250 > height && rect.top > 250);
            const isCentered = !isAbove && (rect.bottom + 250 > height);

            const left = Math.max(20, Math.min(width - bubbleWidth - 20, rect.left + (rect.width / 2) - (bubbleWidth / 2)));
            const top = isCentered ? '50%' : (isAbove ? 'auto' : rect.bottom + 20);
            const bottom = isAbove ? (height - rect.top) + 20 : 'auto';

            if (isCentered) {
                setBubbleStyle({ left, top, transform: 'translateY(-50%)', width: bubbleWidth });
                return;
            }

            setBubbleStyle({ bottom, left, top, width: bubbleWidth });
        } else {
            setTargetRect(null);
            setBubbleStyle({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 300 });
        }
    }, [isOpen, currentStep, steps]);

    useEffect(() => {
        if (isOpen) {
            // Ensure target is visible
            const element = document.getElementById(steps[currentStep]?.targetId || '');
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            updateTargetRect();
            const timer = setInterval(updateTargetRect, 100); // Periodic update to handle layout shifts
            return () => { clearInterval(timer); };
        }
    }, [isOpen, currentStep, steps, updateTargetRect]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setCurrentStep(0);
        onClose?.();
    };

    return (
        <>
            {/* Help Trigger Button */}
            <button
                onClick={() => { setIsOpen(true); }}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-white border-2 border-[#d5cba1] text-[#7a6446] hover:bg-[#ffcb05] hover:border-[#ffcb05] hover:text-white transition-all active:scale-90 shadow-sm"
                title="ヘルプを表示"
            >
                <HelpCircle size={24} />
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
                            {/* Dimmed Background with Hole */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 pointer-events-auto"
                                style={{
                                    clipPath: targetRect ? `polygon(
                                        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                                        ${targetRect.left - 8}px ${targetRect.top - 8}px,
                                        ${targetRect.right + 8}px ${targetRect.top - 8}px,
                                        ${targetRect.right + 8}px ${targetRect.bottom + 8}px,
                                        ${targetRect.left - 8}px ${targetRect.bottom + 8}px,
                                        ${targetRect.left - 8}px ${targetRect.top - 8}px
                                    )` : 'none'
                                }}
                                onClick={handleClose}
                            />

                            {/* Info Card */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className={cn(
                                        "absolute pointer-events-auto flex flex-col bg-white rounded-[24px] border-4 border-[#ffcb05] shadow-2xl p-6 font-yusei",
                                        !targetRect ? "fixed" : ""
                                    )}
                                    style={bubbleStyle}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-black text-[#7a6446]">
                                            {steps[currentStep].title}
                                        </h3>
                                        <button onClick={handleClose} className="text-[#c2baa6] hover:text-[#7a6446]">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <p className="text-sm font-bold text-[#a3967d] leading-relaxed mb-6">
                                        {steps[currentStep].description}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex gap-1">
                                            {steps.map((s, i) => (
                                                <div
                                                    key={s.targetId}
                                                    className={cn(
                                                        "h-2 w-2 rounded-full transition-all",
                                                        i === currentStep ? "bg-[#ffcb05] w-4" : "bg-[#f9f1c8]"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            {currentStep > 0 && (
                                                <button
                                                    onClick={handlePrev}
                                                    className="p-2 rounded-xl bg-[#fcfaf2] border-2 border-[#d5cba1] text-[#7a6446] hover:bg-[#f9f1c8]"
                                                >
                                                    <ChevronLeft size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={handleNext}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ffcb05] text-[#7a6446] font-black shadow-sm active:translate-y-1 transition-all"
                                            >
                                                {currentStep === steps.length - 1 ? '完了' : '次へ'}
                                                {currentStep < steps.length - 1 && <ChevronRight size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Arrow (pointing to target) */}
                                    {targetRect && (
                                        <div
                                            className={cn(
                                                "absolute w-6 h-6 bg-white border-t-4 border-l-4 border-[#ffcb05] rotate-45",
                                                bubbleStyle.bottom !== 'auto' ? "-bottom-3 left-1/2 -ml-3 rotate-[225deg]" : "-top-3 left-1/2 -ml-3"
                                            )}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    )}
                </AnimatePresence>
                , document.body)}
        </>
    );
}
