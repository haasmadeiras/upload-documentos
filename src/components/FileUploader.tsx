import React, { useState, useCallback } from 'react'
import { UploadCloud, File as FileIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void
  file: File | null
  accept?: string
}

export function FileUploader({ onFileSelect, file, accept = '.pdf,.jpg,.png' }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

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
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
    if (!accept.includes(extension)) {
      alert('Formato de arquivo inválido.')
      return
    }
    onFileSelect(selectedFile)
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
            <p className="mb-2 text-sm text-muted-foreground text-center">
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
            <Button variant="ghost" size="icon" onClick={() => onFileSelect(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
