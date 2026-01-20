import path from "node:path";
import exifr from "exifr";
import type { CollectionConfig } from "payload";

export const Photos: CollectionConfig = {
  slug: "photos",
  access: {
    read: () => true,
  },
  upload: {
    staticDir: path.resolve(process.cwd(), "public/media/photos"),
    imageSizes: [
      {
        name: "thumbnail",
        width: 400,
        height: 300,
        position: "centre",
      },
      {
        name: "card",
        width: 768,
        height: 1024,
        position: "centre",
      },
      {
        name: "feature",
        width: 1024,
        height: undefined, // undefined for auto height
        position: "centre",
      },
    ],
    adminThumbnail: "thumbnail",
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "caption",
      type: "textarea",
    },
    {
      name: "captureDate",
      type: "date",
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "settings",
      type: "group",
      admin: {
        position: "sidebar",
      },
      fields: [
        {
          name: "fStop",
          type: "number",
          label: "F-Stop",
        },
        {
          name: "shutterSpeed",
          type: "text",
          label: "Shutter Speed",
        },
        {
          name: "iso",
          type: "number",
          label: "ISO",
        },
        {
          name: "focalLength",
          type: "number",
          label: "Focal Length (mm)",
        },
        {
          name: "cameraModel",
          type: "text",
          label: "Camera Model",
        },
        {
          name: "lens",
          type: "text",
          label: "Lens",
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation === "create" && req.file && req.file.data) {
          try {
            const fileBuffer = req.file.data;
            const exif = await exifr.parse(fileBuffer);
            if (exif && data) {
              if (!data.captureDate && exif.DateTimeOriginal) {
                data.captureDate = exif.DateTimeOriginal.toISOString();
              }

              const settings = data.settings || {};

              if (!settings.fStop && exif.FNumber) settings.fStop = exif.FNumber;
              if (!settings.iso && exif.ISO) settings.iso = exif.ISO;
              if (!settings.focalLength && exif.FocalLength)
                settings.focalLength = exif.FocalLength;
              if (!settings.cameraModel && exif.Model) settings.cameraModel = exif.Model;
              if (!settings.shutterSpeed && exif.ExposureTime) {
                // Convert decimal exposure time to fraction if possible, or just string
                const time = exif.ExposureTime;
                if (time < 1) {
                  settings.shutterSpeed = `1/${Math.round(1 / time)}`;
                } else {
                  settings.shutterSpeed = String(time);
                }
              }
              if (!settings.lens && exif.LensModel) settings.lens = exif.LensModel;

              data.settings = settings;
            }
          } catch (error) {
            console.error("Error parsing EXIF data:", error);
          }
        }
        return data;
      },
    ],
  },
};
