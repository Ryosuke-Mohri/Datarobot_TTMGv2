import React, { useState } from 'react';
import { toast } from 'sonner';
import Dropzone, { type FileRejection } from 'react-dropzone';
import { EllipsisVertical, Trash } from 'lucide-react';
import fileUpload from '@/assets/file_upload.svg';
import { XIcon, Plus, FileChartColumnIncreasing } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/custom/confirm-dialog';
import { FileSchema, useFileUploadMutation } from '@/api/knowledge-bases/hooks';

interface FileUploaderProps {
    maxSize?: number;
    accept?: { [key: string]: string[] };
    onFilesChange: (files: File[]) => void;
    onDeleteFile: (fileUuid: string) => void;
    baseUuid?: string;
    onUploadComplete?: () => void;
    existingFiles?: FileSchema[];
}

export const FileUploader: React.FC<FileUploaderProps> = ({
    maxSize = 1024 * 1024 * 200,
    accept = {
        'text/plain': ['.txt'],
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/markdown': ['.md'],
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
        'text/csv': ['.csv'],
    },
    onFilesChange,
    baseUuid,
    onUploadComplete,
    onDeleteFile,
    existingFiles = [],
}) => {
    const [files, setFiles] = useState<File[]>([]);
    const [filesToRemove, setFilesToRemove] = useState<FileSchema | undefined>();

    const {
        mutate: uploadFiles,
        isPending: isUploading,
        progress,
    } = useFileUploadMutation({
        baseUuid,
        onSuccess: () => {
            toast.success('Files uploaded successfully');
            setFiles([]);
            onFilesChange([]);
            if (onUploadComplete) {
                onUploadComplete();
            }
        },
        onError: error => {
            toast.error(`Upload failed: ${error}`);
        },
    });

    const onDrop = React.useCallback(
        (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
            const newFiles = acceptedFiles.map(file =>
                Object.assign(file, {
                    preview: URL.createObjectURL(file),
                })
            );

            const updatedFiles = files ? [...files, ...newFiles] : newFiles;

            setFiles(updatedFiles);
            onFilesChange(updatedFiles);

            if (rejectedFiles.length > 0) {
                rejectedFiles.forEach(({ file }) => {
                    console.error(`File ${file.name} was rejected`);
                });
            }
        },
        [files, onFilesChange]
    );

    function onRemove(index: number) {
        if (!files) return;
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onFilesChange(newFiles);
    }

    const handleUpload = () => {
        if (files.length > 0) {
            uploadFiles({ files });
        }
    };

    const currentProgress = progress;

    return (
        <div className="w-full">
            <Dropzone onDrop={onDrop} maxSize={maxSize} accept={accept}>
                {({ getRootProps, getInputProps }) => (
                    <div
                        {...getRootProps()}
                        onClick={event => {
                            event.stopPropagation();
                        }}
                        className="border border-dashed border-primary/20 p-4 rounded-lg w-full min-h-[300px] mt-6"
                    >
                        <input data-testid="file-input" {...getInputProps()} />
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-medium">Upload Files</h3>
                            <Button
                                data-testid="add-files-button"
                                {...getRootProps()}
                                className="cursor-pointer"
                                type="button"
                                size="sm"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add files
                            </Button>
                        </div>

                        {currentProgress !== 100 && currentProgress !== 0 && (
                            <Progress value={currentProgress} className="h-2 mt-4" />
                        )}
                        <ScrollArea className="w-full max-h-[calc(100vh-400px)] min-h-[360px] overflow-y-scroll  scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-300 mt-4 border-t border-primary/10">
                            {!files.length && !existingFiles.length && (
                                <p className="text-center p-6 text-sm text-gray-400">
                                    <img
                                        src={fileUpload}
                                        alt="File Upload"
                                        className="w-16 h-16 mx-auto mb-4"
                                    />
                                    Drag and drop documents here. Supported formats: TXT, PDF, DOCX,
                                    MD, PPTX, CSV.
                                </p>
                            )}
                            {files.length > 0 && (
                                <div className="border-b border-gray-100 pb-4">
                                    {/* New files to upload */}
                                    {files.map((file, index) => (
                                        <div
                                            key={`new-${index}`}
                                            className="group flex items-center pt-4 gap-4 w-full"
                                        >
                                            <div className="flex justify-center items-center w-8">
                                                <FileChartColumnIncreasing className="w-6 text-muted-foreground" />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <div className="text-sm font-normal leading-tight truncate">
                                                    {file.name}
                                                </div>
                                                <div className="text-xs text-gray-400 leading-tight truncate">
                                                    File size:{' '}
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </div>
                                            </div>
                                            <div className="flex items-center ml-2">
                                                <XIcon
                                                    className="w-4 h-4 cursor-pointer text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={event => {
                                                        event.stopPropagation();
                                                        onRemove(index);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Existing files */}
                            {existingFiles.map((file, index) => (
                                <div
                                    key={`existing-${index}`}
                                    className="group flex items-center pt-4 gap-4 w-full border-gray-100 pb-4"
                                >
                                    <div className="flex justify-center items-center w-8">
                                        <FileChartColumnIncreasing className="w-6 text-blue-500" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="text-sm font-normal leading-tight truncate">
                                            {file.filename}
                                        </div>
                                        <div className="text-xs text-gray-400 leading-tight truncate">
                                            Added: {new Date(file.added).toLocaleDateString()}
                                            {file.size_bytes &&
                                                ` • ${(file.size_bytes / 1024 / 1024).toFixed(2)} MB`}
                                        </div>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                className="justify-self-end cursor-pointer"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => true}
                                            >
                                                <EllipsisVertical strokeWidth="4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => setFilesToRemove(file)}
                                                className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-gray-700"
                                            >
                                                <Trash />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                )}
            </Dropzone>

            {files.length > 0 && (
                <div className="mt-4 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setFiles([]);
                            onFilesChange([]);
                        }}
                        disabled={isUploading}
                    >
                        Clear
                    </Button>
                    <Button
                        data-testid="upload-button"
                        onClick={handleUpload}
                        disabled={isUploading || files.length === 0}
                    >
                        {isUploading
                            ? currentProgress === 100
                                ? 'Saving...'
                                : 'Uploading...'
                            : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
                    </Button>
                </div>
            )}
            <ConfirmDialog
                open={Boolean(filesToRemove)}
                confirmButtonText="Remove"
                onOpenChange={() => {
                    setFilesToRemove(undefined);
                }}
                title={`Remove File: ${filesToRemove?.filename || ''}`}
                onConfirm={() => {
                    onDeleteFile(filesToRemove?.uuid || '');
                    setFilesToRemove(undefined);
                }}
            >
                <div>Are you sure you want to remove this file?</div>
            </ConfirmDialog>
        </div>
    );
};
