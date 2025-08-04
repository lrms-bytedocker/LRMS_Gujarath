"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { LandFormsContainer } from "@/components/forms/land-forms-container";
import { LandRecordProvider } from "@/contexts/land-record-context";

export default function LandFormsPage() {
  const router = useRouter();

  return (
    <LandRecordProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Land Master
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Add New Land</h1>
                <p className="text-muted-foreground">
                  Complete the land registration forms
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Forms Content */}
        <div className="container mx-auto px-6 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Land Registration Forms</CardTitle>
              <CardDescription>
                Please fill out all required forms to register new land records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LandFormsContainer />
            </CardContent>
          </Card>
        </div>
      </div>
    </LandRecordProvider>
  );
}
