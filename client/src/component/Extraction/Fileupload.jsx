import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';

const FileUpload = React.memo(({ onFilesSelected, value = [] }) => {
  const [files, setFiles] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const fileUrl = useMemo(() => {
    if (files.length > 0) {
      return URL.createObjectURL(files[0]);
    }
    return null;
  }, [files]);

  useEffect(() => {
     setFiles(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, []);

  const handleFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList);
    setFiles(newFiles);
    if (typeof onFilesSelected === "function") {
      onFilesSelected(newFiles);
    }
  }, [onFilesSelected]);

  const handleFileClick = useCallback(() => {
    fileInputRef.current.click();
  }, []);

  const removeFile = useCallback(() => {
    setFiles([]);
    if (typeof onFilesSelected === "function") {
      onFilesSelected([]);
    }
  }, [onFilesSelected]);

  if (files.length > 0) {
    const file = files[0];

    return (
      <div className="w-full bg-background-alt border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary truncate">{file.name}</h3>
          <button 
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            onClick={removeFile}
          >
            Remove
          </button>
        </div>

        <div className="w-full h-96 bg-background border border-border rounded-md overflow-hidden">
          {file.type === 'application/pdf' ? (
            <iframe
              src={fileUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-text-primary font-medium mb-2">File: {file.name}</p>
              <p className="text-text-secondary mb-1">Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p className="text-text-secondary">Type: {file.type}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full min-h-80 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
        isDragging 
          ? 'border-primary bg-primary/5' 
          : 'border-border bg-background-alt hover:border-primary/50 hover:bg-primary/5'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleFileClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        className="hidden"
      />
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-2">Drag and drop files here, or click to select files</h3>
        <p className="text-sm text-text-secondary max-w-md">
          Upload a single file to verify your extraction, or run a bulk extraction on multiple files asynchronously.
        </p>
      </div>
    </div>
  );
});

FileUpload.displayName = 'FileUpload';

export default FileUpload;
