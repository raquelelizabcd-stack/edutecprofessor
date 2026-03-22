import { useState, useEffect } from 'react';
import { bnccData, BnccStructure, BnccItem } from '../data/bnccData';

export interface BnccCode extends BnccItem {
    id: string; // Using codigo as id for internal compatibility if needed, or real ID if provided
    descricao: string; // Mapping objective to description
}

export function useBncc() {
    const [bnccStructure, setBnccStructure] = useState<BnccStructure | null>(null);
    const [bnccCodes, setBnccCodes] = useState<BnccCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            setBnccStructure(bnccData);
            
            // Flatten for compatibility
            const flat: BnccCode[] = [];
            
            // EI
            Object.keys(bnccData.BNCC.EI).forEach(fKey => {
                const faixa = bnccData.BNCC.EI[fKey];
                Object.keys(faixa.campos).forEach(cKey => {
                    faixa.campos[cKey].forEach(item => {
                        flat.push({
                            ...item,
                            id: item.codigo, // Use codigo as id temporarily
                            descricao: item.objetivo
                        });
                    });
                });
            });

            // EF
            Object.keys(bnccData.BNCC.EF).forEach(bKey => {
                const bloco = bnccData.BNCC.EF[bKey];
                Object.keys(bloco.componentes).forEach(cKey => {
                    bloco.componentes[cKey].forEach(item => {
                        flat.push({
                            ...item,
                            id: item.codigo, // Use codigo as id temporarily
                            descricao: item.objetivo
                        });
                    });
                });
            });

            setBnccCodes(flat);
            setIsLoading(false);
        } catch (err: any) {
            console.error('Error loading BNCC data:', err);
            setError(err.message);
            setIsLoading(false);
        }
    }, []);

    return { bnccStructure, bnccCodes, isLoading, error };
}
