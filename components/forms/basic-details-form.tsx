"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const basicDetailsSchema = z.object({
  surveyNumberType: z.enum([
    "Survey Number",
    "Block Number",
    "Re-Survey Number",
  ]),
  surveyNumber: z.string().min(1, "Survey number is required"),
  subDivision: z.string().optional(),
  area: z.number().min(0.01, "Area must be greater than 0"),
  areaUnit: z.enum(["acre", "sqm", "hectare"]),
  landClassification: z.string().min(1, "Land classification is required"),
  soilType: z.string().optional(),
  irrigation: z.enum(["Irrigated", "Non-Irrigated", "Partially Irrigated"]),
  remarks: z.string().optional(),
});

type BasicDetailsFormData = z.infer<typeof basicDetailsSchema>;

interface BasicDetailsFormProps {
  onComplete: () => void;
}

export function BasicDetailsForm({ onComplete }: BasicDetailsFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<BasicDetailsFormData>({
    resolver: zodResolver(basicDetailsSchema),
    defaultValues: {
      surveyNumberType: "Survey Number",
      areaUnit: "acre",
      irrigation: "Non-Irrigated",
    },
  });

  const onSubmit = (data: BasicDetailsFormData) => {
    console.log("Basic Details:", data);
    setIsSubmitted(true);
    onComplete();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Survey Number Type */}
          <FormField
            control={form.control}
            name="surveyNumberType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Survey Number Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select survey number type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Survey Number">Survey Number</SelectItem>
                    <SelectItem value="Block Number">Block Number</SelectItem>
                    <SelectItem value="Re-Survey Number">
                      Re-Survey Number
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Survey Number */}
          <FormField
            control={form.control}
            name="surveyNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Survey Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter survey number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sub Division */}
          <FormField
            control={form.control}
            name="subDivision"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sub Division (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter sub division" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Area */}
          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter area"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Area Unit */}
          <FormField
            control={form.control}
            name="areaUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area Unit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="acre">Acre</SelectItem>
                    <SelectItem value="sqm">Square Meter</SelectItem>
                    <SelectItem value="hectare">Hectare</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Land Classification */}
          <FormField
            control={form.control}
            name="landClassification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Land Classification</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Agricultural">Agricultural</SelectItem>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Forest">Forest</SelectItem>
                    <SelectItem value="Wasteland">Wasteland</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Soil Type */}
          <FormField
            control={form.control}
            name="soilType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Soil Type (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select soil type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Alluvial">Alluvial</SelectItem>
                    <SelectItem value="Black Cotton">Black Cotton</SelectItem>
                    <SelectItem value="Red">Red</SelectItem>
                    <SelectItem value="Laterite">Laterite</SelectItem>
                    <SelectItem value="Sandy">Sandy</SelectItem>
                    <SelectItem value="Clay">Clay</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Irrigation */}
          <FormField
            control={form.control}
            name="irrigation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Irrigation Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select irrigation status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Irrigated">Irrigated</SelectItem>
                    <SelectItem value="Non-Irrigated">Non-Irrigated</SelectItem>
                    <SelectItem value="Partially Irrigated">
                      Partially Irrigated
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Remarks */}
        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any additional remarks about the land"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitted}>
            {isSubmitted ? "Completed ✓" : "Save Basic Details"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
