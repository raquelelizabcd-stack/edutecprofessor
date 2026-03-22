import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface LandingNavbarProps {
    onGoToLogin: () => void;
}

export default function LandingNavbar({ onGoToLogin }: LandingNavbarProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-black/5 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#00A859] rounded-xl flex items-center justify-center text-white font-bold text-xl">
                        E
                    </div>
                    <span className="text-2xl font-bold tracking-tight">EduTec<span className="text-[#00A859]">Pro</span></span>
                </div>

                <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                    <a href="#home" className="hover:text-[#00A859] transition-colors">Início</a>
                    <a href="#funcionalidades" className="hover:text-[#00A859] transition-colors">Funcionalidades</a>
                    <a href="#planos" className="hover:text-[#00A859] transition-colors">Planos</a>
                    <a href="#contato" className="hover:text-[#00A859] transition-colors">Contato</a>
                    <button
                        onClick={onGoToLogin}
                        className="px-5 py-2.5 bg-[#1A1A1A] text-white rounded-full hover:bg-black transition-all"
                    >
                        Acessar Sistema
                    </button>
                </nav>

                <button
                    className="md:hidden p-2 hover:bg-black/5 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-b border-black/5 overflow-hidden"
                    >
                        <div className="px-6 py-8 flex flex-col gap-6 font-medium">
                            <a href="#home" onClick={() => setIsMenuOpen(false)} className="text-lg hover:text-[#00A859]">Início</a>
                            <a href="#funcionalidades" onClick={() => setIsMenuOpen(false)} className="text-lg hover:text-[#00A859]">Funcionalidades</a>
                            <a href="#planos" onClick={() => setIsMenuOpen(false)} className="text-lg hover:text-[#00A859]">Planos</a>
                            <a href="#contato" onClick={() => setIsMenuOpen(false)} className="text-lg hover:text-[#00A859]">Contato</a>
                            <button
                                onClick={() => { onGoToLogin(); setIsMenuOpen(false); }}
                                className="w-full py-4 bg-[#1A1A1A] text-white rounded-full font-semibold"
                            >
                                Acessar Sistema
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
