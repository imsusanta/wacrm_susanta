import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://helpa.studio';
  const lastModified = new Date();

  return [
    // Core Landing & Conversion Pages
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/security`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // Industry Solutions Pages (High-Intent SEO)
    {
      url: `${baseUrl}/solutions/clinics`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/solutions/salons`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/solutions/coaching`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/solutions/real-estate`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // Core Features Pages
    {
      url: `${baseUrl}/features/ai-receptionist`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features/ai-calling`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features/whatsapp-crm`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features/appointment-booking`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/features/automated-broadcasts`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // Competitor Alternative / Comparison Pages
    {
      url: `${baseUrl}/compare/wati-alternative`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare/interakt-alternative`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // Contact & Support
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },

    // Legal & Trust
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refund`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
