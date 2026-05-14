"use client";

import React, { useState, useMemo, useEffect, useRef, ChangeEvent } from 'react';
import { 
  Lock, Banknote, Loader2, Zap, ShoppingCart,
  Home, Clock, Wallet, Car, Ship, CalendarDays, 
  FileText, Landmark, MapPin, Navigation, ArrowRight,
  Stethoscope, Download, Info, Coins, Package, Monitor, Baby,
  ChevronDown, ChevronUp, ShieldCheck, Compass, Activity, Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { calculateBudget, canonicalCountry, RATES } from '@/lib/calculations';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

const IKEA_KIT_ITEMS = [
  { name: "LINANÄS 3-seat Sofa", generic: "3-seat Sofa", q: { single: 1, 'married-dual': 1, 'family-1': 1, 'family-2': 2, 'family-3': 2 } },
  { name: "LACK Coffee Table", generic: "Coffee Table", q: { single: 1, 'married-dual': 1, 'family-1': 1, 'family-2': 2, 'family-3': 2 } },
  { name: "TIPHEDE Rug", generic: "Floor Rug", q: { single: 1, 'married-dual': 1, 'family-1': 1, 'family-2': 2, 'family-3': 2 } },
  { name: "SLATTUM Upholstered Bed", generic: "Double Bed Frame", q: { single: 1, 'married-dual': 1, 'family-1': 2, 'family-2': 3, 'family-3': 4 } },
  { name: "VESTMARKA Sprung Mattress", generic: "Sprung Mattress", q: { single: 1, 'married-dual': 1, 'family-1': 2, 'family-2': 3, 'family-3': 4 } },
  { name: "SMÅSPORRE Duvet", generic: "Duvet", q: { single: 1, 'married-dual': 1, 'family-1': 2, 'family-2': 3, 'family-3': 4 } },
  { name: "LUNDTRAV Pillow", generic: "Pillow", q: { single: 2, 'married-dual': 4, 'family-1': 6, 'family-2': 8, 'family-3': 10 } },
  { name: "DVALA Fitted Sheet", generic: "Fitted Sheet", q: { single: 1, 'married-dual': 1, 'family-1': 2, 'family-2': 3, 'family-3': 4 } },
  { name: "BARLAST Floor Lamp", generic: "Floor Lamp", q: { single: 1, 'married-dual': 1, 'family-1': 2, 'family-2': 2, 'family-3': 3 } },
  { name: "SOLHETTA LED Bulb", generic: "LED Bulb", q: { single: 2, 'married-dual': 2, 'family-1': 2, 'family-2': 2, 'family-3': 2 } },
  { name: "MELLTORP Table", generic: "Dining Table", q: { single: 1, 'married-dual': 1, 'family-1': 1, 'family-2': 1, 'family-3': 1 } },
  { name: "ADDE Chair", generic: "Chair", q: { single: 2, 'married-dual': 2, 'family-1': 4, 'family-2': 4, 'family-3': 6 } },
  { name: "ANNONS Pot with Lid", generic: "Cooking Pot", q: { single: 2, 'married-dual': 2, 'family-1': 3, 'family-2': 3, 'family-3': 3 } },
  { name: "MOPSIG Cutlery Set", generic: "Cutlery Set", q: { single: 1, 'married-dual': 1, 'family-1': 2, 'family-2': 2, 'family-3': 3 } },
  { name: "OFTAST Plate / Bowl", generic: "Plate / Bowl", q: { single: 2, 'married-dual': 4, 'family-1': 6, 'family-2': 8, 'family-3': 10 } },
  { name: "MULIG Clothes Rack", generic: "Clothes Rack", q: { single: 1, 'married-dual': 2, 'family-1': 3, 'family-2': 4, 'family-3': 5 } },
  { name: "BJÄRSEN Shower Curtain", generic: "Shower Curtain", q: { single: 1, 'married-dual': 1, 'family-1': 1, 'family-2': 1, 'family-3': 1 } },
  { name: "ENUDDEN Toilet Brush", generic: "Toilet Brush", q: { single: 1, 'married-dual': 1, 'family-1': 1, 'family-2': 2, 'family-3': 2 } },
  { name: "PEPPRIG Broom/Dustpan", generic: "Broom / Dustpan", q: { single: 1, 'married-dual': 1, 'family-1': 1, 'family-2': 1, 'family-3': 1 } },
  { name: "FNISS Trash Can", generic: "Waste Bin", q: { single: 1, 'married-dual': 1, 'family-1': 2, 'family-2': 2, 'family-3': 3 } },
  { name: "Standard Delivery", generic: "Local Delivery", q: { single: 1, 'married-dual': 1, 'family-1': 1, 'family-2': 1, 'family-3': 1 } }
];



export default function PreparePage() {
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  // 🕹️ State
  const [calcStatus, setCalcStatus] = useState<string>('single');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [transportMode, setTransportMode] = useState<'public' | 'drive' | 'taxi'>('drive');
  const [setupDays, setSetupDays] = useState<string>('45'); 
  const [arrivalAllowance, setArrivalAllowance] = useState<number>(0);
  const [monthlyCommitments, setMonthlyCommitments] = useState<number>(0);
  const [hasLoadedMemory, setHasLoadedMemory] = useState(false);
  const [currency, setCurrency] = useState<string>('GBP');
  const [baggageCount, setBaggageCount] = useState<number>(0);
  const [baggageOverride, setBaggageOverride] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(2000);
  const [uniformOverride, setUniformOverride] = useState<number | null>(null);
  const [electronicsTotal, setElectronicsTotal] = useState<number>(500);
  const [electronicsItems, setElectronicsItems] = useState([
    { id: 'tv', name: '42" Smart TV', cost: 350, selected: true },
    { id: 'toaster', name: 'Toaster', cost: 30, selected: true },
    { id: 'hairdryer', name: 'Hair Dryer', cost: 40, selected: true },
    { id: 'kettle', name: 'Kettle', cost: 30, selected: true },
    { id: 'iron', name: 'Iron & Board', cost: 50, selected: false },
    { id: 'microwave', name: 'Microwave', cost: 80, selected: false },
  ]);
  const [showElectronicsKit, setShowElectronicsKit] = useState(false);
  const [showIkeaKit, setShowIkeaKit] = useState(false);
  const [showDependents, setShowDependents] = useState(false);

  // Overrides
  const [docsOverride, setDocsOverride] = useState<number | null>(null);
  const [housingOverride, setHousingOverride] = useState<number | null>(null);
  const [expenditureOverride, setExpenditureOverride] = useState<number | null>(null);
  const [transportOverride, setTransportOverride] = useState<number | null>(null);
  const [logisticsOverride, setLogisticsOverride] = useState<number | null>(null);
  const [familyOverride, setFamilyOverride] = useState<number | null>(null);
  const [electronicsOverride, setElectronicsOverride] = useState<number | null>(null);
  const [childcareOverride, setChildcareOverride] = useState<number | null>(null);
  const [ikeaOverride, setIkeaOverride] = useState<number | null>(null);
  const [ikeaDisplayCurrency, setIkeaDisplayCurrency] = useState<string>('Local');

  const resetToDefaults = () => {
    setDocsOverride(null);
    setHousingOverride(null);
    setExpenditureOverride(null);
    setTransportOverride(null);
    setLogisticsOverride(null);
    setFamilyOverride(null);
    setElectronicsOverride(null);
    setBaggageOverride(null);
    setBaggageCount(0);
    setUniformOverride(null);
    setIkeaOverride(null);
  };

  // 🛰️ Data
  const { data: schools, isLoading: isLoadingSchools } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted])
  );
  const { data: cities } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted])
  );
  const { data: requirements } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'teacher_requirements') : null), [firestore, mounted])
  );
  const { data: ikeaIntel } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'ikea_intel') : null), [firestore, mounted])
  );
  const { data: transportIntel } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'transport_intel') : null), [firestore, mounted])
  );
  const { data: exchangeRates } = useDoc<any>(
    useMemoFirebase(() => (mounted && firestore ? doc(firestore, 'system', 'exchange_rates') : null), [firestore, mounted])
  );

  const currentRates = useMemo(() => ({ ...RATES, ...(exchangeRates?.gbpBase || {}) }), [exchangeRates]);

  // 💾 Memory
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('leopardfish-prep-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCalcStatus(parsed.calcStatus || 'single');
      setSelectedCountry(parsed.selectedCountry || 'all');
      setSelectedSchoolId(parsed.selectedSchoolId || null);
      setTransportMode(parsed.transportMode || 'drive');
      setSetupDays(parsed.setupDays || '45');
      setArrivalAllowance(parsed.arrivalAllowance || 0);
      setMonthlyCommitments(parsed.monthlyCommitments || 0);
      setBaggageCount(parsed.baggageCount || 0);
      setBaggageOverride(parsed.baggageOverride ?? null);
      setShippingCost(parsed.shippingCost ?? 2000);
      setUniformOverride(parsed.uniformOverride ?? null);
      setElectronicsTotal(parsed.electronicsTotal ?? 500);
      setElectronicsItems(parsed.electronicsItems ?? [
        { id: 'tv', name: '42" Smart TV', cost: 350, selected: true },
        { id: 'toaster', name: 'Toaster', cost: 30, selected: true },
        { id: 'hairdryer', name: 'Hair Dryer', cost: 40, selected: true },
        { id: 'kettle', name: 'Kettle', cost: 30, selected: true },
        { id: 'iron', name: 'Iron & Board', cost: 50, selected: false },
        { id: 'microwave', name: 'Microwave', cost: 80, selected: false },
      ]);
      setDocsOverride(parsed.docsOverride ?? null);
      setHousingOverride(parsed.housingOverride ?? null);
      setExpenditureOverride(parsed.expenditureOverride ?? null);
      setTransportOverride(parsed.transportOverride ?? null);
      setLogisticsOverride(parsed.logisticsOverride ?? null);
      setFamilyOverride(parsed.familyOverride ?? null);
      setElectronicsOverride(parsed.electronicsOverride ?? null);
      setIkeaOverride(parsed.ikeaOverride ?? null);
    }
    setHasLoadedMemory(true);
  }, []);

  useEffect(() => {
    if (hasLoadedMemory) {
      localStorage.setItem('leopardfish-prep-state', JSON.stringify({ 
        calcStatus, selectedCountry, selectedSchoolId, transportMode, setupDays, arrivalAllowance, monthlyCommitments,
        baggageCount, baggageOverride, shippingCost, uniformOverride, electronicsTotal, electronicsItems,
        docsOverride, housingOverride, expenditureOverride, transportOverride, logisticsOverride, familyOverride, electronicsOverride, ikeaOverride
      }));
    }
  }, [calcStatus, selectedCountry, selectedSchoolId, transportMode, setupDays, arrivalAllowance, monthlyCommitments, baggageCount, baggageOverride, shippingCost, uniformOverride, electronicsTotal, electronicsItems, docsOverride, housingOverride, expenditureOverride, transportOverride, logisticsOverride, familyOverride, electronicsOverride, ikeaOverride, hasLoadedMemory]);

  const prevCountryRef = useRef(selectedCountry);
  const prevSchoolIdRef = useRef(selectedSchoolId);

  useEffect(() => {
    if (hasLoadedMemory) {
      const countryChanged = prevCountryRef.current !== selectedCountry;
      const schoolChanged = prevSchoolIdRef.current !== selectedSchoolId;
      
      if (countryChanged || schoolChanged) {
        setBaggageOverride(null);
        setUniformOverride(null);
        setDocsOverride(null);
        setHousingOverride(null);
        setExpenditureOverride(null);
        setTransportOverride(null);
        setLogisticsOverride(null);
        setFamilyOverride(null);
        setElectronicsOverride(null);
        setIkeaOverride(null);
        setArrivalAllowance(0);
        setMonthlyCommitments(0);
        setBaggageCount(0);
        setShippingCost(2000);
        setElectronicsTotal(500);

        prevCountryRef.current = selectedCountry;
        prevSchoolIdRef.current = selectedSchoolId;
      }
    }
  }, [selectedCountry, selectedSchoolId, hasLoadedMemory]);

  // 🏎️ Filters — country list driven by SCHOOLS (not cities), matching other pages
  const availableCountries = useMemo(() => {
    if (!schools) return [];
    return Array.from(new Set(schools.map((s: any) => s.country).filter(Boolean))).sort() as string[];
  }, [schools]);

  const filteredSchools = useMemo(() => {
    if (!schools) return [];
    if (!selectedCountry || selectedCountry === 'all') return schools;
    return schools.filter((s: any) => canonicalCountry(s.country) === canonicalCountry(selectedCountry));
  }, [selectedCountry, schools]);

  const countryIntel = useMemo(() => {
    if (!selectedCountry || selectedCountry === 'all' || !cities) return null;
    const canon = canonicalCountry(selectedCountry);
    return cities.find((c: any) => canonicalCountry(c.country) === canon) || null;
  }, [selectedCountry, cities]);

  const selectedSchool = useMemo(() => schools?.find(s => s.id === selectedSchoolId), [selectedSchoolId, schools]);
  
  const cityData = useMemo(() => {
    if (!selectedSchool || !cities) return null;
    const schoolCity = (selectedSchool.city || '').toLowerCase().trim();
    return cities.find(c => (c.city || '').toLowerCase().trim() === schoolCity) || null;
  }, [selectedSchool, cities]);
  
  const selectedIkea = useMemo(() => {
    if (!selectedCountry || selectedCountry === 'all' || !ikeaIntel) return null;
    const canon = canonicalCountry(selectedCountry);
    const docId = canon.toLowerCase().replace(/\s+/g, '-').trim();
    const cleanCountry = selectedCountry.toLowerCase().trim();
    return ikeaIntel.find((d: any) => 
      d.id === docId || 
      d.id === selectedCountry.toLowerCase().replace(/\s+/g, '-').trim() ||
      (d.country && d.country.toLowerCase().trim() === cleanCountry) ||
      (d.country && d.country.toLowerCase().includes(cleanCountry)) ||
      (d.country && cleanCountry.includes(d.country.toLowerCase()))
    ) || null;
  }, [selectedCountry, ikeaIntel]);

  // Set default commitments from DB if available and not yet set
  useEffect(() => {
    if (cityData?.studentLoans && monthlyCommitments === 0) {
      setMonthlyCommitments(cityData.studentLoans);
    }
  }, [cityData]);

  // 🧮 Calculation Logic — uses shared engine
  // Auto-calculate electronics total from kit
  useEffect(() => {
    const sum = electronicsItems.filter(i => i.selected).reduce((acc, item) => acc + item.cost, 0);
    setElectronicsTotal(sum);
  }, [electronicsItems]);

  const budget = useMemo(() => {
    // 🛰️ NEW TRANSPORT INTEL REDIRECTION
    const targetCountry = selectedSchool?.country || selectedCountry;
    const tIntel = transportIntel?.find((t: any) => 
        canonicalCountry(t.country) === canonicalCountry(targetCountry) || 
        t.id === canonicalCountry(targetCountry).replace(/\s+/g, '-')
    );

    const enrichedCityData = cityData ? { ...cityData, transport: tIntel || cityData.transport } : cityData;
    const enrichedCountryIntel = countryIntel ? { ...countryIntel, transport: tIntel || countryIntel.transport } : countryIntel;

    return calculateBudget({
      ratesOverride: currentRates,
      calcStatus,
      selectedSchool,
      cityData: enrichedCityData,
      countryIntel: enrichedCountryIntel,
      transportMode,
      setupDays,
      currency,
      monthlyCommitments,
      baggageCount,
      baggageOverride,
      shippingCost,
      uniformOverride,
      electronicsTotal,
      docsOverride,
      housingOverride,
      expenditureOverride,
      transportOverride,
      logisticsOverride,
      familyOverride,
      electronicsOverride,
      ikeaOverride,
      selectedIkea
    });
  }, [calcStatus, selectedSchool, cityData, countryIntel, transportIntel, transportMode, setupDays, currency, monthlyCommitments, baggageCount, baggageOverride, shippingCost, uniformOverride, electronicsTotal, docsOverride, housingOverride, expenditureOverride, transportOverride, logisticsOverride, familyOverride, electronicsOverride, ikeaOverride, selectedIkea, currentRates]);

  const totalReserve = useMemo(() => {
    return Math.max(0, budget.total - arrivalAllowance);
  }, [budget.total, arrivalAllowance]);

  const downloadIkeaPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 127, 255); // #007FFF
    doc.text("Leopardfish Intel", 20, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Field Mobilization Unit // Arrive Prepared", 20, 32);
    
    // Line separator
    doc.setDrawColor(230, 230, 230);
    doc.line(20, 38, 190, 38);
    
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    const titlePrefix = selectedIkea ? "IKEA Shopping List" : "Startup Inventory";
    doc.text(`${titlePrefix}: ${selectedCountry}`, 20, 50);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    const subtext = selectedIkea 
      ? "Basic startup essentials: Bedding, kitchenware, and core furniture."
      : "Standard mobilization inventory: Recommended essentials for local sourcing.";
    doc.text(subtext, 20, 58);
    
    // List
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    let y = 75;
    
    // Status label in PDF
    const statusLabel = calcStatus.replace('-', ' ').toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.text(`Configuration: ${statusLabel}`, 20, 68);
    doc.setFont("helvetica", "normal");

    IKEA_KIT_ITEMS.forEach((item) => {
      const quantity = (item.q as any)[calcStatus] || 1;
      const itemName = selectedIkea ? item.name : item.generic;
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, y - 4, 4, 4); // Checkbox
      doc.text(`${quantity}x`, 28, y);
      doc.text(itemName, 40, y);
      y += 9;
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
    });
    
    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`Generated for ${selectedSchool?.schoolname || 'International Deployment'} // Data source: Leopardfish Intel Database`, 20, 285);
    
    doc.save(`Leopardfish_${titlePrefix}_${selectedCountry.replace(/\s+/g, '_')}.pdf`);
  };
  const downloadBriefingPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const primary = [20, 20, 20];
    const textMain = [40, 40, 40];
    const textMuted = [120, 120, 120];

    let y = 35;
    let pageCount = 1;

    const drawHeader = (title: string) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.line(20, 25, 190, 25);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text("LEOPARDFISH INTEL // FIELD MANUAL", 20, 20);
        doc.text(title.toUpperCase(), 190, 20, { align: 'right' });
    };

    const drawFooter = (page: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.1);
        doc.line(20, 280, 190, 280);
        doc.setFontSize(7);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(`PAGE ${page}`, 20, 287);
        doc.text("STRICTLY CONFIDENTIAL // PRINTER-FRIENDLY DOSSIER", 190, 287, { align: 'right' });
    };

    const printHeading = (text: string, fontSize: number = 10, marginTop: number = 6) => {
        if (y > 255) {
            drawFooter(pageCount);
            doc.addPage();
            pageCount++;
            drawHeader("FIELD MANUAL");
            y = 35;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(text.toUpperCase(), 20, y);
        y += (fontSize * 0.4) + marginTop;
    };

    const printLine = (text: string, fontSize: number = 9, fontStyle: 'normal' | 'bold' | 'italic' = 'normal', color: number[] = [40, 40, 40], marginTop: number = 4) => {
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(fontSize);
        doc.setTextColor(color[0], color[1], color[2]);
        const wrapped = doc.splitTextToSize(text, 170);
        for (let i = 0; i < wrapped.length; i++) {
            if (y > 270) {
                drawFooter(pageCount);
                doc.addPage();
                pageCount++;
                drawHeader("FIELD MANUAL");
                y = 35;
                doc.setFont("helvetica", fontStyle);
                doc.setFontSize(fontSize);
                doc.setTextColor(color[0], color[1], color[2]);
            }
            doc.text(wrapped[i], 20, y);
            y += fontSize * 0.42;
        }
        y += marginTop;
    };

    // PAGE 1: COVER & WELCOME
    drawHeader("INTRODUCTION");
    printHeading("STRICTLY CONFIDENTIAL: INTERNATIONAL DEPLOYMENT DOSSIER", 11, 4);
    printLine("PRINTER-FRIENDLY EDITION", 8, "bold", textMuted, 10);

    printHeading("STAFF ROOM BRIEFING: WELCOME TO THE JUMP", 10, 4);
    printLine("Grab a brew and take a seat. You are looking at a contract for your next overseas post. First of all, congratulations. Getting through the CV sorting, the time-zone-mangled interviews, and the reference checks is no small feat.", 9, "normal", textMain, 4);
    printLine("But right now, you are looking at a PDF. Our job is to translate that PDF into a realistic life for you on the ground.", 9, "normal", textMain, 4);
    printLine("This guide is your staff room mentor. It dynamically adjusts to the data we already hold on your target country, but it requires you to ask the right questions to fill in the blanks. We are going to walk through the reality of getting your money right, sorting your paperwork without losing your mind, and surviving the first 60 days. No jargon, no HR spin. Let's get into it.", 9, "normal", textMain, 8);

    printHeading("TACTICAL ROADMAP: THE SIX PHASES", 10, 4);
    const phases = [
        "01. Discover: Scouring the indices. Understand the cost of living versus the 'IKEA index'. Prague is affordable, but 'Family' status shifts the maths.",
        "02. Evaluate: The Contract Check. TACTICAL WARNING: Check for salary scale ambiguity and NDA clauses. If they won't talk about pay openly, that's a red flag.",
        "03. Decide: Confirming the move. Check school-specific benefits like flight caps or temporary hotel stays.",
        "04. Prepare: The Document Phase. Degree certificates, police checks, and embassy registrations. This is the 'marking' phase of the move-tedious but vital.",
        "05. Schools: IS Prague specific setup. Contact HR early to secure childcare spots-availability in Prague is notoriously tight.",
        "06. Connect: Transport and Banking. Set up your 'Lítačka' (metro pass) and international wire apps before you land."
    ];
    phases.forEach(p => printLine(p, 8.5, "normal", textMain, 3));

    // PAGE BREAK OR CONTINUE TO PART 1
    y += 4;
    printHeading("PART 1: THE ART OF THE PUSHBACK (NEGOTIATION)", 10, 4);
    printLine("Recruitment is a pricey business. It costs a school thousands to recruit a solid candidate. If they have sent you an offer, they want you. You have leverage, but you need to use it with a velvet glove.", 9, "normal", textMain, 6);

    printLine("Step 1: The Scale Reconnaissance & Red Flags", 9, "bold", primary, 2);
    printLine("Right now, we don't actually know if your target school uses a rigid salary scale or if they make up the numbers as they go along. You cannot negotiate the rules until you know what game you are playing.", 9, "normal", textMain, 4);
    printLine("The Inquisitive Question: 'Could you clarify if the school operates on a fixed, step-based salary scale, or is compensation negotiated on an individual basis?'", 9, "italic", primary, 4);
    printLine("The Red Flags: This is where you test the waters. If they won't talk openly about how the pay scale works, or worse, if there are NDA clauses stopping teachers from discussing pay, run a mile. A school that hides its numbers usually has something to hide. Other massive red flags include vague 'discretionary' wording around bonuses, or a flat-out refusal to let you speak to current staff.", 9, "normal", textMain, 4);
    printLine("The Pushback: If they do have a scale, don't ask for more money-ask for a scale review. Look closely at the step they offered. Did they count your supply years? 'Thank you for the initial placement at Step 4. Looking at my CV, I have two years of long-term supply that weren't factored in. Is there any flexibility for the entry step to be reviewed to reflect my full tenure?'", 9, "normal", textMain, 6);

    printLine("Step 2: The Soft Money Perks", 9, "bold", primary, 2);
    printLine("If the basic salary is locked tight, pivot to the 'Soft Money.' These are budget lines sitting in different pots that a Head can sign off much easier than a permanent salary bump.", 9, "normal", textMain, 4);
    printLine("Relocation & Shipping: If they offer £1,000 for shipping, ask for £2,000, or ask if they can cover an excess baggage allowance for your flight.", 9, "normal", textMain, 3);
    printLine("CPD & Upskilling: Ask if there is a guaranteed CPD pot. 'I am really keen to start my Masters next year. Does the school have a CPD budget that could commit to part-funding this course within my initial contract?'", 9, "normal", textMain, 6);

    printLine("Step 3: The Currency Safeguard", 9, "bold", primary, 2);
    printLine("In today's wobbly global economy, how you get paid matters just as much as how much.", 9, "normal", textMain, 3);
    printLine("The Inquisitive Question: 'Could you walk me through how the school supports staff if the local currency experiences a sudden drop? Is there a hard-currency split (e.g., paid 50% in GBP/EUR/USD) or an exchange rate protection clause?'", 9, "italic", primary, 8);

    printHeading("PART 2: THE PAPER TRAIL (DOCUMENTS & VISAS)", 10, 4);
    printLine("Do not underestimate the bureaucracy. It is a marathon, and it requires upfront cash.", 9, "normal", textMain, 4);
    printLine("The Reality Check: You will need police checks (ACRO, FBI, etc.), university transcripts, and marriage/birth certificates. Most countries require these to be notarized, then apostilled by your foreign office, and finally legalized by the target country's embassy.", 9, "normal", textMain, 4);
    printLine("The Cost: This can easily cost hundreds of pounds and take months. Start the second you sign. Do not wait for HR to chase you.", 9, "normal", textMain, 4);
    printLine("The Inquisitive Question: 'Could HR provide a comprehensive checklist of the exact documents required for the visa? Also, does the school reimburse the attestation and legalization fees upon arrival?'", 9, "italic", primary, 8);

    printHeading("PART 3: THE ARRIVAL RESERVE (CASH FLOW)", 10, 4);
    const calcReserve = Math.max(0, budget.total - arrivalAllowance);
    printLine(`Look at your Leopardfish dashboard. You will see a required Arrival & Setup Reserve (e.g., your safety net figure of ${formatCurrency(calcReserve, budget.displayCurrency)}). This number is not a suggestion; it is your survival fund.`, 9, "normal", textMain, 4);
    printLine("The 60-Day Gap: International schools usually pay in arrears. If you land in early August, paperwork delays often push your first full payday to late September. You are funding your own life for up to two months.", 9, "normal", textMain, 4);
    printLine("The 'Settling-In' Trap: Some schools offer a 'settling-in allowance' upon arrival. You need to know exactly what this is. Is it an actual extra perk (free money to buy pots and pans), or is it just a pro-rata advance of your own salary for the induction days worked before your official contract starts? Don't spend it like a bonus if they are going to deduct it from your September pay!", 9, "normal", textMain, 4);
    printLine("The Inquisitive Question: 'Just to help with my personal cash flow planning, on what exact date can I realistically expect my first full salary deposit to clear into my local bank account? Also, regarding the settling-in allowance-is this an additional relocation grant, or is it a pro-rata salary advance for the induction days before the official contract starts?'", 9, "italic", primary, 8);

    printHeading("PART 4: GROUND SETUP (HEALTH, TECH & TRANSPORT)", 10, 4);
    printLine("The first week is a blur. Control the variables you can.", 9, "normal", textMain, 4);
    printLine("Medical Gap: Do not assume you are covered the second you step off the plane. There is often a gap before local insurance activates. Buy a comprehensive 30-day travel insurance policy so you aren't bankrupted by a sprained ankle during moving week.", 9, "normal", textMain, 4);
    printLine("Phones & Internet: Buy an eSIM (like Airalo) before you fly so you have data on the tarmac.", 9, "normal", textMain, 4);
    printLine("The Inquisitive Question: 'Can you confirm if my medical insurance is active from the moment my flight lands, or should I arrange temporary travel cover for the induction weeks?'", 9, "italic", primary, 8);

    printHeading("PART 5: A ROOF OVER YOUR HEAD (HOUSING)", 10, 4);
    printLine("Unless the school is putting you in a fully furnished, on-campus flat, the housing hunt is your biggest hurdle.", 9, "normal", textMain, 4);
    printLine("The Hotel Trap: Most schools will put you in a hotel or corporate apartment for 10 to 30 days while you flat-hunt. Critically, ask who pays for this hotel. People get caught out assuming the school has paid the bill, only to face a massive charge on checkout because it was actually a 'reimbursement' scheme and they now have to wait two months to get the cash back.", 9, "normal", textMain, 4);
    printLine("The Inquisitive Question: 'Could you clarify the temporary hotel accommodation upon arrival-specifically, how many nights are covered, and critically, does the school settle the bill directly or am I expected to pay upfront and claim it back?'", 9, "italic", primary, 4);
    printLine("The Leaver Trick: Find out who is leaving the school. Buy their stuff. You can often furnish an entire flat for a fraction of the cost by buying the TV, sofa, and kitchen gear from a teacher flying home. You could even ask to take on their apartment lease, saving you weeks of flat-hunting and estate agent fees.", 9, "normal", textMain, 8);

    printHeading("PART 6: HR SUPPORT (EXPECTATIONS VS. REALITY)", 10, 4);
    printLine("Your school's HR department is managing the arrival of multiple new teachers simultaneously. They are stretched thin.", 9, "normal", textMain, 4);
    printLine("The Reality: They will handle the legalities-visas, Ministry of Education approvals, local bank letters. They will not hold your hand to set up your home WiFi, buy your groceries, or argue with your new landlord about a leaky tap.", 9, "normal", textMain, 4);
    printLine("The Staff Room Buddy: Ask to be assigned a 'Buddy'-a current teacher in your department. HR deals with policy; your Buddy deals with reality.", 9, "normal", textMain, 4);
    printLine("The Inquisitive Question: 'Would it be possible to be put in touch with a current teacher in my department? I'd love to ask a few informal, practical questions about life on the ground before I pack.'", 9, "italic", primary, 8);

    printHeading("THE FIELD MANUAL CHECKLIST", 10, 4);
    const checklists = [
        ["Documentation", ["Visa & work permit applications", "Notarised/Apostilled degree certificates", "Embassy registration for UK citizens", "Criminal record checks (ACRO)"]],
        ["Accommodation", ["First 14 days of temporary housing confirmed (and payment method checked)", "Local estate agent (Reality) contacts saved", "Rental contract review process understood", "Utility setup (Electricity/Gas) plan in place"]],
        ["Salary & Banking", ["Confirm first payday (Day 60)", "Set up Revolut/Wise for initial international transfers", "Local bank account application ready", "Budget for 2 months' 'runway' secured"]],
        ["Health & Family", ["School health insurance start date confirmed", "Emergency hospital locations mapped", "School uniform orders placed", "Childcare subsidy verification"]],
        ["Transport", ["Local pass/Metro card registration started", "Taxi/Bolt/Uber app downloaded and set up", "International Driving Permit obtained"]],
        ["Home Comforts", ["IKEA or startup items budgeted", "Electronics voltage check (230V)", "Wi-Fi installation lead times checked"]]
    ];
    checklists.forEach(([section, items]) => {
        printLine(section as string, 9, "bold", primary, 2);
        (items as string[]).forEach(item => printLine(`[ ]  ${item}`, 8.5, "normal", textMain, 2));
        y += 2;
    });

    y += 4;
    printHeading("THE SAMPLE HR EMAIL (THE 'ART OF THE PUSHBACK' IN ACTION)", 10, 4);
    printLine("Do not send 15 different emails. Compile your queries into one polite, highly professional message.", 9, "normal", textMain, 4);
    printLine("Subject: Contract Queries & Relocation Logistics - [Your Name]", 8.5, "bold", primary, 2);
    
    const emailBody = [
        "Dear [HR Contact Name / Head of School],",
        "Thank you so much for sending the contract through. I am absolutely thrilled about the offer and very excited at the prospect of joining the team in August.",
        "Before I sign and return the documents, I am just mapping out my logistics and cash flow for the move, and I had a few points of clarification I was hoping you could help me with:",
        "1. Salary & Placement: Thank you for the initial placement at Step 4. Looking closely at the scale, I noticed my two years doing long-term supply weren't included. Given the classroom management skills built during that time, is there any flexibility for the entry step to be reviewed to reflect my full tenure?",
        "2. Arrival Cash Flow: Just to help with my personal cash flow planning, on what exact date can I realistically expect my first full salary deposit to clear into my local bank account? Also, regarding the settling-in allowance-is this an additional relocation grant, or is it a pro-rata salary advance for the induction days before the official contract starts?",
        "3. Temporary Housing: Could you clarify the temporary hotel accommodation upon arrival? Specifically, how many nights are covered, and critically, does the school settle the bill directly or am I expected to pay upfront and claim it back?",
        "4. Medical Insurance: Can you confirm if my school medical insurance is active from the moment my flight lands, or should I arrange my own temporary travel cover for the induction weeks?",
        "5. Connections: Would it be possible to be put in touch with a current teacher in my department, or perhaps a teacher who is leaving this summer? I'd love to ask a few practical questions about life on the ground, and see if I might be able to take over an apartment lease or buy some second-hand furniture to make the transition easier!",
        "Thank you again for all your support during this process. I look forward to hearing from you.",
        "Kind regards,",
        "[Your Name]"
    ];
    emailBody.forEach(line => printLine(line, 8.5, "italic", textMain, 3));

    drawFooter(pageCount);
    doc.save(`The_Ultimate_Arrival_Plan_${selectedCountry.replace(/\s+/g, '_')}.pdf`);
  };

  if (!mounted || isLoadingSchools) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-[#f97316]" /></div>;

  return (
    <div className="container mx-auto px-4 md:px-12 py-10 text-white bg-[#020617] min-h-screen font-sans">
      
      {/* Header */}
      <div className="mb-6 space-y-1">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic leading-none uppercase">
          The ultimate <span className="text-[#f97316]">arrival plan.</span>
        </h1>
        <p className="text-[#94a3b8] font-bold text-[11px] tracking-[0.05em] opacity-80 italic">Because improvising is a great strategy for a Friday afternoon lesson, but a terrible one for international relocation.</p>
      </div>

      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Tactical Warning Alert Moved Down */}
        
        {/* ROW 1: Details & Dashboard (Height Matched) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-4 flex">
            <Card className="bg-[#0b1224] border-white/10 p-6 w-full space-y-5 flex flex-col justify-center">
              <h3 className="text-[11px] font-black text-[#f97316] tracking-widest uppercase italic underline underline-offset-8 mb-2">Your details</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 italic">1. Which country?</Label>
                  <Select value={selectedCountry} onValueChange={(val: string) => { setSelectedCountry(val); setSelectedSchoolId(null); }}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[11px] font-black italic text-[#fafaf9]"><SelectValue placeholder="Select country..." /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      <SelectItem value="all">Everywhere</SelectItem>
                      {availableCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 italic">2. Which school?</Label>
                  <Select value={selectedSchoolId ?? ''} onValueChange={(val: string) => setSelectedSchoolId(val)}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[11px] font-black italic text-[#fafaf9]"><SelectValue placeholder="Pick your school..." /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      {filteredSchools.map(s => <SelectItem key={s.id} value={s.id}>{s.schoolname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <Label className="text-[10px] font-bold text-slate-500 italic">3. Family status</Label>
                  <Select value={calcStatus} onValueChange={(val: string) => setCalcStatus(val)}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[11px] font-black italic text-[#fafaf9]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married-dual">Married (dual income)</SelectItem>
                      <SelectItem value="family-1">Family (1 child)</SelectItem>
                      <SelectItem value="family-2">Family (2 children)</SelectItem>
                      <SelectItem value="family-3">Family (3+ children)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <Label className="text-[10px] font-bold text-slate-500 italic">4. Home commitments?</Label>
                  <div className="relative">
                    <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-sky-400" />
                    <Input 
                      type="number" 
                      value={monthlyCommitments || ''} 
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setMonthlyCommitments(Number(e.target.value))}
                      placeholder="e.g. Student loans"
                      className="bg-black/40 border-white/10 h-10 pl-7 text-[11px] font-black italic text-[#fafaf9] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <p className="text-[8px] font-bold text-slate-600 italic">Include student loans or property costs back home.</p>
                  
                  <Label className="text-[10px] font-bold text-slate-500 italic flex items-center gap-2 uppercase tracking-widest pt-2">
                    Childcare cost (override?)
                    <div className="group relative">
                      <Info className="size-3 text-sky-400 cursor-help" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-black border border-white/10 rounded-sm text-[10px] font-bold text-slate-300 leading-tight italic opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                        Enter any additional childcare expenses. If left blank, defaults to 0.
                      </div>
                    </div>
                  </Label>
                  <div className="relative">
                    <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-sky-400" />
                    <Input
                      type="number"
                      value={childcareOverride ?? ''}
                      onChange={(e) => setChildcareOverride(e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g. 300"
                      className="bg-black/40 border-white/10 h-10 pl-7 text-[11px] font-black italic text-[#fafaf9] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-sm space-y-1 mt-2">
                    <div className="flex items-center gap-2">
                      <Info className="size-3 text-amber-500" />
                      <p className="text-[9px] font-black text-amber-500 uppercase italic">Childcare Alert</p>
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 italic leading-snug">
                      Availability and rates vary wildly. Contact your school HR early to secure a spot and verify current subsidies.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex">
            <div className="bg-[#0b1224] border border-white/10 rounded-sm shadow-2xl w-full flex flex-col">
              {/* 🏔️ DASHBOARD TOP: Primary Intelligence */}
              <div className="relative bg-gradient-to-br from-[#0b1224] to-[#020617] p-8 lg:p-12 border-b border-white/5">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Zap className="absolute -top-10 -right-10 size-96 opacity-[0.03] rotate-12 text-white" />
                </div>
                
                {/* 🛰️ DATA HIERARCHY */}
                {/* 🛰️ ROW 1: PRIMARY INTELLIGENCE */}
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                  
                  {/* Reserve Counter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <p className="text-[11px] font-black text-[#f97316] tracking-[0.4em] uppercase leading-none italic whitespace-nowrap">Arrival & setup reserve</p>
                    </div>
                    <p className={cn(
                      "font-black italic tracking-tighter leading-none transition-all duration-300 drop-shadow-2xl",
                      totalReserve > 9999 ? "text-5xl lg:text-6xl" : "text-6xl lg:text-7xl"
                    )}>
                      {formatCurrency(totalReserve, budget.displayCurrency)}
                    </p>
                    
                    {/* Tactical Currency Switcher */}
                    <div className="flex bg-black/60 backdrop-blur-md rounded-none p-0.5 border border-white/10 w-fit mt-4">
                      {['GBP', 'USD', 'EUR', 'Local'].map((c) => (
                        <button
                          key={c}
                          disabled={c === 'Local' && selectedCountry === 'all'}
                          onClick={() => setCurrency(c)}
                          className={cn(
                            "px-3 py-1 text-[10px] font-black transition-all uppercase",
                            currency === c ? "bg-[#f97316] text-white" : "text-slate-500 hover:text-white disabled:opacity-20"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Operational Inputs (Top Tier - Vertically Stacked) */}
                  <div className="flex flex-col gap-5 w-full lg:w-auto">
                    <div className="space-y-1.5 min-w-[200px]">
                      <Label className="text-[10px] font-bold text-slate-500 italic flex items-center gap-2 uppercase tracking-widest">
                        First payday? 
                        <div className="group relative">
                          <Info className="size-3 text-sky-400 cursor-help" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-black border border-white/10 rounded-sm text-[10px] font-bold text-slate-300 leading-tight italic opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                            Paperwork delays often push your first pay to the 60-day mark.
                          </div>
                        </div>
                      </Label>
                      <Select value={setupDays} onValueChange={(val: string) => setSetupDays(val)}>
                        <SelectTrigger className="bg-black/60 border-white/10 h-12 text-[11px] font-black italic text-[#fafaf9] rounded-none focus:ring-[#f97316]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                          <SelectItem value="30">30 days (On time)</SelectItem>
                          <SelectItem value="45">45 days (Gap likely)</SelectItem>
                          <SelectItem value="60">60 days (Safety)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-[150px]">
                      <Label className="text-[10px] font-bold text-slate-500 italic uppercase tracking-widest">Arrival allowances?</Label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#f97316]" />
                        <Input 
                          type="number" 
                          value={arrivalAllowance || ''} 
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setArrivalAllowance(Number(e.target.value))}
                          placeholder="e.g. 1500"
                          className="bg-black/60 border-white/10 h-12 pl-10 text-[11px] font-black italic text-[#fafaf9] rounded-none focus-visible:ring-[#f97316] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 📊 ROW 2 & 3: SECONDARY INPUTS & BREAKDOWN STATS (Consistently Boxed) */}
              <div className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 bg-black/20 border-t border-white/5">
                
                {/* Stat Outputs with Overrides */}
                <StatItem 
                  label="Visas & docs" 
                  value={budget.docs} 
                  icon={FileText} 
                  currency={budget.displayCurrency} 
                  overrideValue={docsOverride}
                  onOverride={(val) => setDocsOverride(val)}
                  info="Estimated legal and processing fees for your specific family profile and region."
                />
                <StatItem 
                  label="Rent & deposit" 
                  value={budget.housing} 
                  icon={Home} 
                  currency={budget.displayCurrency} 
                  overrideValue={housingOverride}
                  onOverride={(val) => setHousingOverride(val)}
                  info={budget.isSubsidised ? "Subsidised (50%) rate applied. Typically covers first month rent + security deposit." : "Covers estimated first month rent plus security deposit (usually 1.5 months)."}
                />
                <StatItem 
                  label={`Living (${setupDays} days)`} 
                  value={budget.expenditure} 
                  icon={Wallet} 
                  currency={budget.displayCurrency} 
                  overrideValue={expenditureOverride}
                  onOverride={(val) => setExpenditureOverride(val)}
                  info="Covers groceries, utilities, and basic daily essentials scaled for your family size and arrival duration."
                />

                <StatItem 
                  label="Logistics" 
                  value={budget.logistics} 
                  icon={Package} 
                  currency={budget.displayCurrency} 
                  overrideValue={logisticsOverride}
                  onOverride={(val) => setLogisticsOverride(val)}
                  info="Combined estimate for excess baggage and global shipping costs."
                />
                <StatItem 
                  label="Electronics" 
                  value={budget.electronics} 
                  icon={Monitor} 
                  currency={budget.displayCurrency} 
                  overrideValue={electronicsOverride}
                  onOverride={(val) => setElectronicsOverride(val)}
                  action={
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowElectronicsKit(!showElectronicsKit); }}
                      className="p-1 px-2 text-[8px] font-black uppercase italic text-sky-400 hover:text-white transition-colors bg-sky-400/10 border border-sky-400/20 rounded-none z-10 whitespace-nowrap"
                    >
                      {showElectronicsKit ? 'Close' : 'Select'}
                    </button>
                  }
                />
                <StatItem 
                  label="Transport" 
                  value={budget.transport} 
                  icon={Car} 
                  currency={budget.displayCurrency} 
                  overrideValue={transportOverride}
                  onOverride={(val) => setTransportOverride(val)}
                  info={transportMode === 'drive' ? "Estimated cost for a reliable second-hand car purchase and initial registration." : (transportMode === 'taxi' ? "Estimated cost for daily ride-share/taxi trips for the duration of your setup period." : "Estimated cost for public transport passes and initial commute setup.")}
                />
                
                {budget.family > 0 && (
                  <StatItem 
                    label="Family setup" 
                    value={budget.family} 
                    icon={Baby} 
                    currency={budget.displayCurrency} 
                    overrideValue={familyOverride}
                    onOverride={(val) => setFamilyOverride(val)}
                    info="Estimated costs for school uniforms."
                  />
                )}
                
                <StatItem 
                  label="IKEA Run" 
                  value={budget.ikea} 
                  icon={ShoppingCart} 
                  currency={budget.displayCurrency} 
                  overrideValue={ikeaOverride}
                  onOverride={(val) => setIkeaOverride(val)}
                  info="Estimated cost for initial home essentials and furnishing based on your family profile."
                />
              </div>

              {/* 🔌 Electronics Genkit Expandable */}
              {showElectronicsKit && (
                <div className="px-8 lg:px-12 pb-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="bg-sky-400/5 border border-sky-400/10 p-4">
                    <div className="flex items-center justify-between mb-3 border-b border-sky-400/10 pb-2">
                      <h3 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] italic flex items-center gap-2">
                        <Monitor className="size-3" /> SELECT
                      </h3>
                      <p className="text-[10px] font-black italic text-slate-500">Live Estimate: £{electronicsTotal}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {electronicsItems.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            const newItems = [...electronicsItems];
                            newItems[idx].selected = !newItems[idx].selected;
                            setElectronicsItems(newItems);
                          }}
                          className={cn(
                            "p-2 border transition-all flex flex-col items-start gap-1 group/item",
                            item.selected 
                              ? "bg-sky-400/10 border-sky-400/30 text-white" 
                              : "bg-black/40 border-white/5 text-slate-500 grayscale hover:grayscale-0 hover:border-white/20"
                          )}
                        >
                          <span className="text-[8px] font-black uppercase tracking-wider">{item.name}</span>
                          <span className="text-[9px] font-bold italic opacity-60">£{item.cost}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest italic">
                        * Tactical Genkit build complete. Selected items accumulated in mission reserve.
                      </p>
                      <p className="text-[7px] font-bold text-slate-600 italic">
                        Regional averages in GBP applied.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 🔄 Reset Row */}
              <div className="px-8 pb-8 flex justify-end">
                <button 
                  onClick={resetToDefaults}
                  className="text-[9px] font-black text-[#f97316] hover:text-[#00e5ff] uppercase tracking-widest italic transition-colors"
                >
                  Reset all overrides to LeopardfishIntel defaults
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Warning Alert (New Position) */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-4 animate-in slide-in-from-top-4 duration-700">
          <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-500 italic">Tactical Warning: Regional Estimates</p>
            <p className="text-[10px] font-bold text-slate-400 italic leading-snug">
              Calculations are based on Leopradfishintel regional and school indices. School-specific benefits (like hotel stays or flight caps) can significantly shift these outcomes. please adjust data fields to refelct your personalised offer in order ot get the most accurate results.
            </p>
          </div>
        </div>

        {/* ROW 2: Risks & IKEA (Height Matched) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-4 flex flex-col gap-3">
             <RiskCard icon={Banknote} title="Pay scale ambiguity" desc="Treat a lack of clear salary scales as a warning sign." />
             <RiskCard icon={Lock} title="NDA clauses" desc="Check restrictions on discussing pay or the school climate." />
          </div>

          <div className="lg:col-span-8 flex flex-col gap-3">
            <Card className={cn("border-white/10 p-5 flex flex-col justify-between w-full shadow-lg transition-all gap-4", selectedCountry !== 'all' ? "bg-[#0b1224]" : "bg-slate-900/50 opacity-50")}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {(() => {
                    const hasIkea = selectedIkea && (() => {
                      const ikeaKey = Object.keys(selectedIkea).find(k => k.toLowerCase().includes('ikea'));
                      if (ikeaKey) {
                        const val = selectedIkea[ikeaKey];
                        if (val !== undefined && val !== null && val !== "" && !['0', 'no', 'false', 'n', 'f'].includes(String(val).toLowerCase().trim())) {
                          return true;
                        }
                      }
                      const altKeys = ['Has Ikea', 'Has IKEA', 'Has_Ikea', 'hasIkea', 'Ikea', 'IKEA'];
                      for (const k of altKeys) {
                        const val = selectedIkea[k];
                        if (val !== undefined && val !== null && val !== "" && !['0', 'no', 'false', 'n', 'f'].includes(String(val).toLowerCase().trim())) {
                          return true;
                        }
                      }
                      return false;
                    })();
                    return (
                      <>
                        <div className={cn(
                          "p-3 rounded-full", 
                          hasIkea
                            ? "bg-green-500/10 text-green-500" 
                            : (selectedIkea ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500")
                        )}>
                          <ShoppingCart className="size-6" />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-white italic leading-tight">
                            IKEA readiness check: <span className="text-sky-400 underline decoration-sky-400/30 underline-offset-4">{selectedCountry !== 'all' ? selectedCountry : 'Your destination'}</span>
                          </h4>
                          <p className="text-[10px] font-bold text-slate-500 tracking-tight italic mt-1">
                            {selectedIkea 
                              ? (hasIkea ? "Verified IKEA presence. Using actual cost indices." : "No local IKEA verified. Using regional shipping estimates.")
                              : "Standard furnishing estimate. Essential inventory listed below."}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {selectedCountry !== 'all' && (
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <button 
                      onClick={() => setShowIkeaKit(!showIkeaKit)}
                      className="p-2 px-3 text-[9px] font-black uppercase italic border border-white/10 hover:bg-white hover:text-black transition-all"
                    >
                      {showIkeaKit ? 'Hide Items' : 'View Kit'}
                    </button>
                    <button 
                      onClick={downloadIkeaPdf}
                      className="p-2 px-3 text-[9px] font-black uppercase italic bg-sky-400 text-black hover:bg-white transition-all flex items-center gap-2"
                    >
                      <Download className="size-3" /> PDF
                    </button>
                  </div>
                )}
              </div>

              {selectedIkea && (
                <div className="border-t border-white/5 pt-3 mt-1">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {(() => {
                      let targetLocalCurrency = selectedIkea['Currency'] || 'USD';
                      if (targetLocalCurrency === 'Local' || targetLocalCurrency === 'local' || !targetLocalCurrency) {
                        targetLocalCurrency = 'USD';
                      }
                      const activeIkeaCurrency = ikeaDisplayCurrency === 'Local' ? targetLocalCurrency : ikeaDisplayCurrency;
                      return (
                        <>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 italic">
                            <span className="text-slate-500 font-black tracking-widest uppercase">Base currency:</span>
                            <Select value={ikeaDisplayCurrency} onValueChange={setIkeaDisplayCurrency}>
                              <SelectTrigger className="w-[95px] h-6 bg-black/40 border-white/10 text-white text-[9px] font-black italic rounded-none tracking-wider px-2">
                                <SelectValue placeholder="Local" />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0b1224] border-white/10 text-white min-w-[95px]">
                                <SelectItem value="Local" className="text-[9px] font-black italic uppercase tracking-wider focus:bg-white focus:text-black">Local ({targetLocalCurrency})</SelectItem>
                                <SelectItem value="GBP" className="text-[9px] font-black italic uppercase tracking-wider focus:bg-white focus:text-black">GBP (£)</SelectItem>
                                <SelectItem value="USD" className="text-[9px] font-black italic uppercase tracking-wider focus:bg-white focus:text-black">USD ($)</SelectItem>
                                <SelectItem value="EUR" className="text-[9px] font-black italic uppercase tracking-wider focus:bg-white focus:text-black">EUR (€)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap gap-4 text-[10px]">
                            {[
                              { label: 'Single', key: 'Single' },
                              { label: 'Couple', key: 'Couple' },
                              { label: 'Family +1', key: 'Family +1' },
                              { label: 'Family +2', key: 'Family +2' },
                              { label: 'Family +3', key: 'Family +3' },
                            ].map((tier, idx) => {
                              const usdVal = Number(selectedIkea[tier.key]) || 1000;
                              const rate = RATES[activeIkeaCurrency] || 1.0;
                              const displayVal = (usdVal / (RATES['USD'] || 1.27)) * rate;
                              const isActive = calcStatus === (tier.key === 'Single' ? 'single' : tier.key === 'Couple' ? 'married-dual' : tier.key === 'Family +1' ? 'family-1' : tier.key === 'Family +2' ? 'family-2' : 'family-3');
                              return (
                                <div key={idx} className={cn(
                                  "flex items-center gap-1.5 p-1 px-2 border italic transition-all",
                                  isActive ? "bg-sky-400/10 border-sky-400/40 text-sky-400" : "bg-black/20 border-white/5 text-slate-500 hover:border-white/10"
                                )}>
                                  <span className="font-bold">{tier.label}:</span>
                                  <span className="font-black text-white">{formatCurrency(displayVal, activeIkeaCurrency)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </Card>

            {/* IKEA COMPACT VIEW */}
            {showIkeaKit && selectedCountry !== 'all' && (
              <div className="bg-[#0b1224] border border-sky-400/20 p-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <h5 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em] italic">
                    {selectedIkea ? "Basic startup essentials (IKEA)" : "Basic startup essentials (Generic)"}
                  </h5>
                  <p className="text-[9px] font-bold text-slate-500 italic">Total Items: {IKEA_KIT_ITEMS.length}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                  {IKEA_KIT_ITEMS.map((item, idx) => {
                    const quantity = (item.q as any)[calcStatus] || 1;
                    const itemName = selectedIkea ? item.name : item.generic;
                    return (
                      <div key={idx} className="flex items-center justify-between text-[9px] font-bold text-slate-300 italic opacity-80 border-b border-white/5 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#f97316]">●</span> {itemName}
                        </div>
                        <span className="text-sky-400 font-black">x{quantity}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-6 text-[8px] font-bold text-slate-600 uppercase italic tracking-widest border-t border-white/5 pt-3">
                  {selectedIkea 
                    ? "* Note: This is a standardized IKEA field kit. Stock levels may vary by region."
                    : "* Note: This is a recommended essentials inventory for countries without a verified IKEA."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM GRID: The Rest */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntelCard title="Documentation" icon={Clock} subtext="Paperwork delays can stop you from getting paid on time." items={["Visa & work permits", "Degree certificates", "Embassy registration"]} />
          <IntelCard title="Accommodation" icon={MapPin} subtext="Sort this early so you're not living out of a suitcase for weeks." items={["First 14 days sorted?", "Searching for a flat", calcStatus.includes('family') ? "Childcare availability" : "School house keys", "Rental contracts"]} />
          <Card className="bg-[#0b1224] border-white/5 p-5 hover:border-sky-400/30 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Navigation className="size-4 text-sky-400 -rotate-90" />
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-white">Transport</CardTitle>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setTransportMode('public')} className={cn("flex-1 py-1.5 text-[9px] font-black uppercase italic rounded-sm border transition-all", transportMode === 'public' ? "bg-sky-400 text-black border-sky-400" : "bg-black/20 border-white/10 text-slate-500")}>Public</button>
                <button onClick={() => setTransportMode('drive')} className={cn("flex-1 py-1.5 text-[9px] font-black uppercase italic rounded-sm border transition-all", transportMode === 'drive' ? "bg-[#f97316] text-white border-[#f97316]" : "bg-black/20 border-white/10 text-slate-500")}>Car Hire</button>
                <button onClick={() => setTransportMode('taxi')} className={cn("flex-1 py-1.5 text-[9px] font-black uppercase italic rounded-sm border transition-all", transportMode === 'taxi' ? "bg-indigo-500 text-white border-indigo-500" : "bg-black/20 border-white/10 text-slate-500")}>Taxi</button>
              </div>
              <ul className="space-y-2 text-[10px] font-bold text-slate-400 italic">
                <li className="flex gap-3"><span className="text-[#f97316]">●</span> {transportMode === 'drive' ? "Driving licence" : (transportMode === 'taxi' ? "Download local taxi apps" : "Metro registration")}</li>
                <li className="flex gap-3"><span className="text-[#f97316]">●</span> {transportMode === 'drive' ? "Hiring or buying" : (transportMode === 'taxi' ? "International SIM card" : "Taxi app setup")}</li>
              </ul>
            </div>
          </Card>
          <IntelCard title="Salary runway" icon={CalendarDays} subtext="Most teachers land in August but won't be paid until late September." items={["Pay dates confirmed", `Funds for the first ${setupDays} days`, "Bank account set up"]} />
          <IntelCard title="Money & banking" icon={Landmark} subtext="Work out how to send money back home and where your final payout goes." items={["Transfer apps set up", "International wire costs", "Payout plans"]} />
          <IntelCard title="Health & registration" icon={Stethoscope} subtext="Check if your school cover starts when you land or only on day one." items={["Insurance start date", "Short-term cover", "Hospital locations"]} />
        </div>
        
        
        {/* 🛰️ MISSION BRIEFING: THE FLI007 ARRIVAL PLAN */}
        <section className="mt-20 border-t-2 border-white/5 pt-20 mb-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 text-black font-black text-[10px] px-2 py-0.5 italic tracking-[0.2em] uppercase">FRED FLI007</div>
                <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">The Ultimate Arrival Plan</h2>
              </div>
              <p className="text-sm font-bold text-slate-400 italic max-w-xl leading-relaxed">
                Because improvising is a great strategy for a Friday afternoon lesson, but a terrible one for international relocation. 
                Your mission-ready briefing document, grounded in Leopardfish Intel.
              </p>
            </div>
            <Button 
              className="bg-amber-500 hover:bg-white text-black font-black text-xs uppercase italic px-10 h-14 rounded-none transition-all group flex items-center gap-3"
              onClick={downloadBriefingPdf}
            >
              <Lock className="size-4 group-hover:hidden" />
              <Download className="size-4 hidden group-hover:block" />
              Generate PDF Briefing
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 p-6 bg-black/40 border border-white/5 relative group hover:border-amber-500/30 transition-all">
              <div className="absolute -top-3 -left-3 bg-amber-500 text-black font-black text-[10px] px-2 py-1 italic">STEP 01</div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Coins className="size-4 text-amber-500" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-white">Calculate your startup buffer</h3>
                </div>
                <p className="text-[10px] font-bold text-slate-400 italic leading-relaxed">
                  This isn't just about the flight; it depends heavily on whether you're landing in a furnished flat or facing an empty apartment in a country where IKEA is a four-hour drive away. Check your contract—'unfurnished' can mean different things in different regions.
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-2 p-6 bg-amber-500/5 border border-amber-500/10 flex items-center justify-center italic">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">More mission phases coming soon in the next intel drop.</p>
            </div>
          </div>
        </section>

        <div className="h-12" />
      </div>
    </div>
  );
}

// 📎 Helpers
function StatItem({ 
  label, value, icon: Icon, currency, info, overrideValue, onOverride, action 
}: { 
  label: string, value: number, icon: any, currency: string, info?: string, 
  overrideValue?: number | null, onOverride?: (val: number | null) => void,
  action?: React.ReactNode
}) {
  const isOverridden = overrideValue !== null && overrideValue !== undefined;
  const displayVal = isOverridden ? overrideValue : Math.round(value);
  const currencySymbol = currency === 'GBP' ? '£' : (currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : currency));
  const isLongSymbol = currencySymbol.length > 1;

  return (
    <div className="bg-black/40 border border-white/5 p-3.5 space-y-3 hover:border-[#f97316]/20 transition-all group relative h-full flex flex-col justify-between">
      <div className="flex items-center justify-between gap-1 min-h-[18px]">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
          <Icon className="size-3 text-sky-400 shrink-0" /> {label}
          {info && (
            <div className="group/info relative shrink-0">
              <Info className="size-2.5 text-slate-600 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-black border border-white/10 rounded-sm text-[10px] font-bold text-slate-300 leading-tight italic opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                {info}
              </div>
            </div>
          )}
        </div>
        {action}
      </div>
      
      <div className="space-y-2">
        <div className="relative">
          <span className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 font-black italic pointer-events-none transition-colors",
            isLongSymbol ? "text-[10px] tracking-tight" : "text-lg",
            isOverridden ? "text-[#f97316]" : "text-slate-500"
          )}>
            {currencySymbol}
          </span>
          <Input 
            type="number" 
            value={displayVal || ''} 
            onChange={(e: ChangeEvent<HTMLInputElement>) => onOverride?.(e.target.value ? Number(e.target.value) : null)}
            className={cn(
              "bg-black/60 border-white/5 h-14 text-2xl font-black italic rounded-none focus-visible:ring-[#f97316] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              isLongSymbol ? "pl-14" : "pl-10",
              isOverridden ? "text-[#f97316] border-[#f97316]/30" : "text-white"
            )}
          />
        </div>
      </div>
    </div>
  );
}

function IntelCard({ title, icon: Icon, items, subtext }: { title: string, icon: any, items: string[], subtext: string }) {
  return (
    <Card className="bg-[#0b1224] border-white/5 p-5 hover:border-sky-400/30 transition-all group text-white">
      <CardHeader className="p-0 mb-3 space-y-1 text-white">
        <div className="flex items-center gap-3 text-white">
          <Icon className="size-4 text-sky-400 text-white" />
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-white">{title}</CardTitle>
        </div>
        <p className="text-[10px] text-slate-500 font-bold leading-tight italic text-white opacity-80">{subtext}</p>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="space-y-2.5 pt-1">
          {items.map((item, i) => (
            <li key={i} className="text-[10px] font-bold text-slate-400 flex items-start gap-3 leading-tight italic">
              <span className="text-[#f97316]">●</span> {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RiskCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-4 bg-[#0b1224] border border-white/5 rounded-sm hover:border-[#f97316]/40 transition-all group w-full">
      <div className="flex items-center gap-3 mb-1.5 text-white">
        <Icon className="size-4 text-[#f97316]" />
        <h4 className="text-[11px] font-black text-white italic tracking-tight">{title}</h4>
      </div>
      <p className="text-[10px] text-slate-500 font-bold leading-tight italic">{desc}</p>
    </div>
  );
}