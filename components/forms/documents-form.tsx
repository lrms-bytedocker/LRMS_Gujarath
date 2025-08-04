"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, CheckCircle } from "lucide-react";

interface DocumentsFormProps {
  onComplete: () => void;
}

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  file: File;
}

const requiredDocuments = [
  {
    id: "survey_settlement",
    name: "Survey Settlement Record",
    description: "Original survey settlement document",
    required: true,
  },
  {
    id: "ownership_deed",
    name: "Ownership Deed",
    description: "Sale deed or ownership document",
    required: true,
  },
  {
    id: "revenue_record",
    name: "Revenue Record",
    description: "Latest revenue record extract",
    required: true,
  },
  {
    id: "identity_proof",
    name: "Identity Proof",
    description: "Aadhaar card or other ID proof",
    required: false,
  },
  {
    id: "address_proof",
    name: "Address Proof",
    description: "Utility bill or address proof",
    required: false,
  },
];

export function DocumentsForm({ onComplete }: DocumentsFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<
    UploadedDocument[]
  >([]);

  const handleFileUpload = (documentId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const newDocument: UploadedDocument = {
      id: documentId,
      name: file.name,
      type: file.type,
      size: file.size,
      file: file,
    };

    setUploadedDocuments((prev) => {
      const filtered = prev.filter((doc) => doc.id !== documentId);
      return [...filtered, newDocument];
    });
  };

  const removeDocument = (documentId: string) => {
    setUploadedDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const isDocumentUploaded = (documentId: string) => {
    return uploadedDocuments.some((doc) => doc.id === documentId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = () => {
    console.log("Documents:", uploadedDocuments);
    setIsSubmitted(true);
    onComplete();
  };

  const requiredDocsUploaded = requiredDocuments
    .filter((doc) => doc.required)
    .every((doc) => isDocumentUploaded(doc.id));

  return (
    <div className="space-y-6">
      {requiredDocuments.map((document) => (
        <Card key={document.id} className="relative">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {document.name}
                  {document.required && <span className="text-red-500">*</span>}
                </CardTitle>
                <CardDescription>{document.description}</CardDescription>
              </div>
              {isDocumentUploaded(document.id) && (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isDocumentUploaded(document.id) ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <div className="flex flex-col items-center justify-center text-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <Label
                    htmlFor={`file-${document.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    Click to upload or drag and drop
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, JPG, PNG (max 10MB)
                  </p>
                  <Input
                    id={`file-${document.id}`}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      handleFileUpload(document.id, e.target.files)
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">
                      {
                        uploadedDocuments.find((doc) => doc.id === document.id)
                          ?.name
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(
                        uploadedDocuments.find((doc) => doc.id === document.id)
                          ?.size || 0
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDocument(document.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end pt-6 border-t">
        <Button
          onClick={handleSubmit}
          disabled={!requiredDocsUploaded || isSubmitted}
          className="gap-2"
        >
          {isSubmitted ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Completed ✓
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Save Documents
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
