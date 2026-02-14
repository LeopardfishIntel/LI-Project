# **App Name**: Know Before You Go

## Core Features:

- Teacher Registration & Verification: Secure sign-up using institutional emails or LinkedIn for verification, supporting public, registered, and 'teachers only' access tiers.
- Global School Search: Prominent, central fuzzy search with autocomplete for schools, countries, or cities, displaying curated 'School Spotlight' summaries.
- Detailed School Profile Pages: Displays 'Intel' (7 Core Data Points like salary, housing, savings potential), school videos, and anonymized teacher reviews from the Supabase database.
- School Comparison Tool: Allows users to select and compare up to 3 schools side-by-side on core data points and cost of living with visual indicators.
- 'Find Your Niche' Matching Engine: An AI-powered tool that matches a teacher's profile (age, qualifications, nationality, experience) to suitable regions and countries, reasoning with user input to suggest ideal locations.
- Cost of Living Calculator: An embedded calculator on country and school pages to estimate total living costs, adjusted for adults and children, leveraging Supabase data.
- Community Forum: A focused discussion platform with categories like Visas & Immigration, Contract Analysis, and Lifestyle & Culture, including social sharing features.

## Style Guidelines:

- Background: Deep Void (#0f172a) for the main page. A very dark slate blue.
- Surface: Gunmetal (#1e293b) for cards (School profiles, Reviews). Slightly lighter than the background.
- Text (Main): Crisp White (#f8fafc) for Headings and primary body text.
- Text (Muted): Ash Grey (#94a3b8) for subtitles, timestamps, less important info.
- Primary Action: Signal Orange (#f97316) for 'Search', 'Sign Up', 'Compare' buttons. High visibility.
- Highlight: Leopard Gold (#fbbf24) for 5-Star Ratings, 'Spotlight' badges, or premium features.
- Link/Info: Data Blue (#38bdf8) for hyperlinks, 'Read More', or neutral data bars.
- Good (Savings/High Salary): Emerald Green (#10b981) for data visualization.
- Bad (High Cost/Low Rating): Rose Red (#ef4444) for data visualization.
- Neutral (Average): Slate Grey (#64748b) for data visualization.
- Headings: Oswald or Montserrat (Bold/Upper Case) to convey an authoritative feel.
- Body Text: Inter or Open Sans for excellent legibility on mobile screens.
- Use a specific library like Heroicons or Lucide React (standard with Supabase/Tailwind).
- Style: 'Outline' style (thin lines) looks more premium than 'Solid' (chunky) icons.
- Card Style: Glassmorphism with slight transparency (backdrop-filter: blur(10px); background: rgba(30, 41, 59, 0.7)).
- Borders: Thin, subtle borders (1px solid #334155) on cards to define edges in Dark Mode.
- Corner Radius: Small Radius (4px - 8px) keeps things looking sharp and professional.
- Spotlight Section: Use a gradient overlay (Transparent at top -> Dark Slate at bottom) on images so text is readable.
- The 'Search' Button: Background: Signal Orange (#f97316). Shape: Rectangular with slightly rounded corners (4px). Hover Effect: Glows slightly (box-shadow: 0 0 15px rgba(249, 115, 22, 0.5)).
- The 'Comparison' Table: Header Row: Dark Gunmetal (#1e293b) with White text. Winning Cell: If School A has a higher salary, highlight that specific cell with a faint Green tint (bg-emerald-900/20) and green text. Losing Cell: Faint Red tint (bg-red-900/20).
- The 'Verified Teacher' Badge: Small pill-shaped tag next to a user's name. Color: Data Blue (#38bdf8) border with transparent background. Icon: A small checkmark.