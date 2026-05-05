import React, { useState, useCallback } from 'react'
import { UploadCloud, File as FileIcon, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  onUploadComplete: (file: File) => void
  accept?: string
}

export function FileUploader({ onUploadComplete, accept = '.pdf,.jpg,.png' }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleFileSelection = (selectedFile: File) => {
    // Check if it's a valid type roughly based on extension
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
    if (!accept.includes(extension)) {
      alert('Formato de arquivo inválido.')
      return
    }
    setFile(selectedFile)
  }

  const simulateUpload = () => {
    if (!file) return
    setIsUploading(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setIsUploading(false)
            onUploadComplete(file)
          }, 500)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  return (
    <div className="w-full">
      {!file ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg transition-colors bg-secondary/30',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:bg-secondary/50',
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Clique para fazer upload</span> ou
              arraste o arquivo
            </p>
            <p className="text-xs text-muted-foreground">PDF, PNG, JPG (Max 10MB)</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="absolute inset-0 cursor-pointer" />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
                <FileIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!isUploading && progress === 0 && (
              <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                <X className="w-4 h-4" />
              </Button>
            )}
            {progress === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          </div>

          {isUploading && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-right text-muted-foreground">{progress}%</p>
            </div>
          )}

          {!isUploading && progress === 0 && (
            <Button onClick={simulateUpload} className="w-full">
              Enviar Documento
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
