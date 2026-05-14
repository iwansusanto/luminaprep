import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const setting_material = {
  maximal: 5,
  maxSize: "10MB"
}

export const setting_quiz = {
  ai_version: "1.0",
  level: [
    {
      value: "beginner",
      label: "Beginner"
    },
    {
      value: "intermediate",
      label: "Intermediate"
    },
    {
      value: "advanced",
      label: "Advanced"
    }
  ],
  count: [
    {
      value: 5,
      label: "5"
    },
    {
      value: 10,
      label: "10"
    },
    {
      value: 15,
      label: "15"
    },
    {
      value: 20,
      label: "20"
    }
  ]

}
