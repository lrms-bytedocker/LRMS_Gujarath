"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const locationSchema = z.object({
  state: z.string().min(1, "State is required"),
  district: z.string().min(1, "District is required"),
  taluka: z.string().min(1, "Taluka is required"),
  village: z.string().min(1, "Village is required"),
  pincode: z.string().min(6, "Valid pincode is required"),
  longitude: z.string().optional(),
  latitude: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface LocationFormProps {
  onComplete: () => void;
}

const districts = ["Pune", "Mumbai", "Nashik", "Aurangabad", "Kolhapur"];
const talukasByDistrict: Record<string, string[]> = {
  Pune: ["Pune City", "Haveli", "Mulshi", "Bhor", "Daund"],
  Mumbai: ["Mumbai City", "Mumbai Suburban", "Thane", "Kalyan"],
  Nashik: ["Nashik", "Malegaon", "Sinnar", "Dindori"],
  Aurangabad: ["Aurangabad", "Gangapur", "Paithan", "Sillod"],
  Kolhapur: ["Kolhapur", "Panhala", "Hatkanangle", "Shirol"],
};

const villagesByTaluka: Record<string, string[]> = {
  "Pune City": ["Kothrud", "Warje", "Karve Nagar", "Aundh"],
  Haveli: ["Pirangut", "Lavale", "Sus", "Bavdhan"],
  Mulshi: ["Paud", "Tamhini", "Donaje", "Bhugaon"],
};

export function LocationForm({ onComplete }: LocationFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      state: "Maharashtra",
    },
  });

  const selectedDistrict = form.watch("district");
  const selectedTaluka = form.watch("taluka");

  const onSubmit = (data: LocationFormData) => {
    console.log("Location Details:", data);
    setIsSubmitted(true);
    onComplete();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="district"
            render={({ field }) => (
              <FormItem>
                <FormLabel>District</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taluka"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taluka</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select taluka" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectedDistrict &&
                      talukasByDistrict[selectedDistrict]?.map((taluka) => (
                        <SelectItem key={taluka} value={taluka}>
                          {taluka}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="village"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Village</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select village" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectedTaluka &&
                      villagesByTaluka[selectedTaluka]?.map((village) => (
                        <SelectItem key={village} value={village}>
                          {village}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pincode</FormLabel>
                <FormControl>
                  <Input placeholder="Enter pincode" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter longitude" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Enter latitude" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitted}>
            {isSubmitted ? "Completed ✓" : "Save Location Details"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
