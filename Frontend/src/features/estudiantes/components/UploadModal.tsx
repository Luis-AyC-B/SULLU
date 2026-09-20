"use client";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/shared/components/ui/dialog";
interface UploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFileSelect: (file: File) => Promise<unknown>;
    isSubmitting?: boolean;
}
export function UploadModal({
    open,
    onOpenChange,
    onFileSelect,
    isSubmitting = false,
}: UploadModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = () => {
        setIsDragOver(false);
    };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await onFileSelect(files[0]);
            onOpenChange(false);
        }
    };
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            e.target.value = "";
            await onFileSelect(file);
            onOpenChange(false);
        }
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900">
                        Importar lista de estudiantes
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Sube un archivo .csv con la lista de estudiantes para este examen.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div
                        onClick={() => !isSubmitting && fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`w-full rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${isDragOver
                                ? "border-[#002D62] bg-[#F0F5FA]"
                                : "border-slate-200 bg-white hover:border-[#002D62]/50 hover:bg-slate-50/60"
                            } ${isSubmitting ? "opacity-60 pointer-events-none" : ""}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                        />
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <UploadCloud className="h-6 w-6" />
                        </div>
                        <h3 className="mt-3 text-sm font-bold text-slate-900">
                            {isSubmitting
                                ? "Procesando archivo..."
                                : "Arrastra el archivo aquí o haz clic"}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                            Formatos aceptados: CSV, XLSX · máx. 5 000 filas
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-[#F4F6F8] p-4 text-left">
                        <h4 className="text-xs font-bold text-slate-800 tracking-tight mb-2">
                            Formato esperado del CSV
                        </h4>
                        <div className="font-mono text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200/50">
                            <p className="font-semibold text-slate-800">nombre,apellido,codsis</p>
                            <p>Ana,Torres,2021-10001</p>
                            <p>Carlos,Pérez,2022-11002</p>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-600">
                            * El sistema registrará a los nuevos estudiantes en el catálogo central y vinculará a los existentes sin duplicar información.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}