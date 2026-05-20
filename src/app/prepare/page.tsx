"use client";

import React, { useState, useMemo, useEffect, useRef, ChangeEvent } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Lock, Banknote, Loader2, Zap, ShoppingCart,
  Home, Clock, Wallet, Car, Ship, CalendarDays, 
  FileText, Landmark, MapPin, Navigation, ArrowRight, ArrowUpRight,
  Stethoscope, Download, Info, Coins, Package, Monitor, Baby, X,
  ChevronDown, ChevronUp, ShieldCheck, Compass, Activity, Globe, Search, Target
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
  const [transportMode, setTransportMode] = useState<'public' | 'drive' | 'taxi'>('public');
  const [pensionRegion, setPensionRegion] = useState<'GB' | 'US'>('GB');
  const [setupDays, setSetupDays] = useState<string>('45'); 
  const [monthlyNetSalary, setMonthlyNetSalary] = useState<number>(3000);
  const [partnerSalary, setPartnerSalary] = useState<number>(0);
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
  const [step1Open, setStep1Open] = useState(false);
  const [step1aOpen, setStep1aOpen] = useState(false);
  const [step1bOpen, setStep1bOpen] = useState(false);
  const [step1cOpen, setStep1cOpen] = useState(false);
  const [step2Open, setStep2Open] = useState(false);
  const [step3Open, setStep3Open] = useState(false);
  const [step3aOpen, setStep3aOpen] = useState(false);
  const [step3bOpen, setStep3bOpen] = useState(false);
  const [step3cOpen, setStep3cOpen] = useState(false);
  const [step3dOpen, setStep3dOpen] = useState(false);
  const [step3eOpen, setStep3eOpen] = useState(false);

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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

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

  const monthlyBudget = useMemo(() => {
    const targetData = cityData?.[0] || cities?.find((c: any) => canonicalCountry(c.country) === canonicalCountry(selectedCountry)) || cities?.[0];
    const rentKey = calcStatus === 'single' ? 'rent1br' : (calcStatus.includes('family-2') || calcStatus.includes('family-3') ? 'rent3br' : 'rent2br');
    const localCurrency = targetData?.currencyCode || 'USD';
    
    const usdToDisplay = (usd: number) => {
      const displayRate = currency === 'Local' ? (currentRates[localCurrency] || 1.0) : (currentRates[currency] || 1.0);
      return (usd / (currentRates['USD'] || 1.27)) * displayRate;
    };

    const rent = usdToDisplay(Number(targetData?.[rentKey] || 1500));
    const transport = usdToDisplay(Number(targetData?.transport?.publicTransport || 100));
    const totalIncome = usdToDisplay(monthlyNetSalary + partnerSalary);

    return {
      rent,
      transport,
      totalIncome
    };
  }, [cityData, cities, selectedCountry, calcStatus, currency, currentRates, monthlyNetSalary, partnerSalary]);

  const totalReserve = useMemo(() => {
    return Math.max(0, budget.total - arrivalAllowance);
  }, [budget.total, arrivalAllowance]);

  const downloadIkeaPdf = async () => {
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
      const qKey = calcStatus === 'married-sole' ? 'married-dual' : calcStatus;
      const quantity = (item.q as any)[qKey] || 1;
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
    const doc = new jsPDF();
    const primary = [20, 20, 20];
    const textMain = [40, 40, 40];
    const textMuted = [120, 120, 120];

    let y = 35;
    let pageCount = 1;

    const missionId = `LFI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const reportDate = `${new Date().getDate()} ${new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;

    const drawHeader = (title: string) => {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        doc.line(20, 24, 190, 24);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        
        // Left Side: LEOPARDFISH INTEL // SECTION TITLE
        doc.setTextColor(249, 115, 22); // Orange
        doc.text("LEOPARDFISH", 20, 20);
        const orangeWidth = doc.getTextWidth("LEOPARDFISH");
        
        doc.setTextColor(56, 189, 248); // Sky Blue
        doc.text("INTEL", 20 + orangeWidth + 1, 20);
        const intelWidth = doc.getTextWidth("INTEL");
        
        doc.setTextColor(150, 150, 150); // Gray
        doc.text(` // ${title.toUpperCase()}`, 20 + orangeWidth + intelWidth + 2, 20);
        
        // Right Side: REPORT GENERATED: ... // MISSION ID: ...
        const rightText = `REPORT GENERATED: ${reportDate} // MISSION ID: ${missionId}`;
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(rightText.toUpperCase(), 190, 20, { align: 'right' });
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

    printHeading("STAFF ROOM BRIEFING: WELCOME TO THE JUMP", 10, 6);
    const familyStatusLabel = 
      calcStatus === 'single' ? 'Single' :
      calcStatus === 'married-dual' ? 'Married (dual income)' :
      calcStatus === 'married-sole' ? 'Married (sole earner)' :
      calcStatus === 'family-1' ? 'Family (1 child)' :
      calcStatus === 'family-2' ? 'Family (2 children)' :
      calcStatus === 'family-3' ? 'Family (3+ children)' : 'Single';
    const schoolLabel = selectedSchool?.schoolname || 'International Deployment';
    const countryLabel = selectedCountry !== 'all' ? selectedCountry : 'International Destination';

    const congratulationText = `Congratulations on your upcoming international post at ${schoolLabel} in ${countryLabel}. Navigating the application screening, the time-zone-mangled interviews, and the reference checks is no small feat. As you prepare for deployment as a ${familyStatusLabel} profile, our job now is to decode and translate that contract into a realistic picture of what your life on the ground will actually look like.`;
    printLine(congratulationText, 9, "normal", textMain, 4);
    
    const adjustmentText = `This Leopardfish Intel guide has been dynamically generated for ${countryLabel} using the specific ground-truth data we hold on ${schoolLabel}. Because you are relocating with a ${familyStatusLabel} status, all calculated runways, legal document fees, local housing expectations, and startup buffers have been tailored to fit your household configuration.`;
    printLine(adjustmentText, 9, "normal", textMain, 4);

    printLine("Below, we are going to walk through the reality of getting your move right, sorting your paperwork, and planning for costs so that you can survive the first 60 days without the stress that often accompanies an unplanned relocation.", 9, "normal", textMain, 10);

    printHeading("TACTICAL ROADMAP: THE SIX PHASES", 10, 4);
    
    const reserveVal = formatCurrency(totalReserve, budget.displayCurrency);

    printLine("01. Discover: The Survival Maths", 9, "bold", primary, 1);
    printLine(`Don't just look at the salary; analyse the Arrival Reserve. This is your "safety net" figure—roughly ${reserveVal} for ${selectedCountry}—required to fund your life before the first payday. Understand the 'IKEA index': the actual cost of locally furnishing a flat and stocking a kitchen from scratch in your target city.`, 8.5, "normal", textMain, 4);

    printLine("02. Evaluate: The Transparency Test", 9, "bold", primary, 1);
    printLine("Scrutinise the contract for Salary Scale Transparency. Professional schools are proud of their fixed, step-based grids that reward tenure. If a school uses 'Negotiable' pay or 'Secret' scales, treat it as a mission warning—it usually hides pay gaps and a lack of equity across the staff room.", 8.5, "normal", textMain, 4);

    printHeading("THE RISK PROFILE: CONTRACT RED FLAGS", 9, 2);
    printLine("• Vague \"Broad Ranges\": A massive salary range lacking a clearly defined ladder is frequently a tactical bait-and-switch designed to lowball you during final negotiations.", 8.5, "normal", textMain, 2);
    printLine(`• Profit-First Chains: Lower-tier corporate or shareholder-driven international schools view teacher compensation purely as a "cost center" to be minimized, leading to aggressive stagnation. While top-tier institutional HR departments (like ${schoolLabel}) are highly reliable for visa legalities and contracts, they simply lack the administrative bandwidth for daily lifestyle onboarding, leaving you to self-finance early setup operations.`, 8.5, "normal", textMain, 2);
    printLine("• The \"Secret\" Grid & NDA Restrictions: If the school operates on a secret grid or enforces NDA clauses preventing staff from discussing compensation, this is a critical mission warning. A school that hides its numbers always has a systemic equity or retention problem to hide.", 8.5, "normal", textMain, 4);

    printHeading("EVALUATION BENCHMARKS: SCALE BEST PRACTICE", 9, 2);
    printLine("• A Transparent Grid: A public table showing exactly what you earn based on your years of experience and degrees.", 8.5, "normal", textMain, 2);
    printLine("• Automatic Annual \"Steps\": A guaranteed pay bump every year you stay at the school, protecting your \"real\" income against regional inflation.", 8.5, "normal", textMain, 2);
    printLine("• Degree Differentials: Clear, higher pay brackets for holding an MA or PhD, acknowledging your expertise.", 8.5, "normal", textMain, 4);

    printLine("03. Decide: The Benefit Audit", 9, "bold", primary, 1);
    printLine("Look beyond the basic salary and audit the 'Soft Money' perks. Check for flight caps, guaranteed CPD (Masters funding), and excess baggage allowances. Crucially, confirm if there is a Currency Safeguard, such as a hard-currency split or exchange rate protection, to prevent your local salary from evaporating if the economy wobbles.", 8.5, "normal", textMain, 4);

    printHeading(`HOUSING SPECTRUM & AUDIT FOR ${selectedCountry.toUpperCase()} AT ${(selectedSchool?.schoolname || 'TARGET SCHOOL').toUpperCase()}`, 9, 2);
    printHeading("THE HOUSING SPECTRUM", 8.5, 2);
    printLine("• Furnished: Sofa, Bed, and Dining table are standard. Verify if it includes \"softs\" like linens and kitchenware.", 8.5, "normal", textMain, 2);
    
    const isOman = selectedCountry.toLowerCase() === 'oman';
    const unfurnishedText = isOman 
      ? `• Unfurnished: In Oman, this guarantees "White Goods" (Fridge/Stove) only, but requires personal capital for soft goods, bedding, and seating, making a settling-in allowance or IKEA Kit mandatory.`
      : `• Unfurnished: In this region, this guarantees "White Goods" (Fridge/Stove) only, but requires personal capital for soft goods, bedding, and seating.`;
    printLine(unfurnishedText, 8.5, "normal", textMain, 2);
    printLine("• Allowances: If taking monthly cash, it must cover 100% of local rent plus at least 70% of average utility costs to prevent lifestyle erosion.", 8.5, "normal", textMain, 4);

    printHeading("HOUSING RISK ASSESSMENT", 8.5, 2);
    printLine("• The \"Commute Trap\": Securing a location 45+ minutes from campus turns free time into hours of unpaid, exhausting travel.", 8.5, "normal", textMain, 2);
    printLine("• Vague \"Suitability\" Clauses: Avoid contracts describing housing as \"suitable\" without providing certified photos, square footage, or video walkthroughs of the specific assigned unit.", 8.5, "normal", textMain, 2);
    printLine("• Mandatory Sharing: Forced apartment sharing with other adult staff is an unacceptable breach of professional and personal boundaries.", 8.5, "normal", textMain, 2);
    printLine("• Expert Field Advice: Bypass HR policy and ask a current teacher living in these units about the three things the school won't disclose: internet reliability, water pressure, and noise levels at 6:00 AM.", 8.5, "italic", primary, 4);

    printHeading("PENSIONS & RETIREMENT STRATEGY (UK / US)", 9, 2);
    printLine("• The UK Play (Class 3 NI): If you have UK ties, protect your UK State Pension. As of April 2026, Class 3 NI is the primary mechanism to protect your UK State Pension. Costing exactly £18.40 / week (~£957/year), each qualifying year adds ~£358 to your annual pension for life. This represents a powerful 3-Year Breakeven ROI—the strongest return on investment for any teacher abroad. You can backfill up to 6 previous years.", 8.5, "normal", textMain, 2);
    printLine("• The US Play (TRS / 403b): For US educators, moving abroad completely pauses accumulating state pension years (TRS) and matching contributions to 403(b) plans, necessitating independent, disciplined wealth-building.", 8.5, "normal", textMain, 2);
    printLine("• The Split Strategy & Weekend Volatility: Use a local bank account strictly for immediate rent and daily life, while executing an automated monthly \"sweep\" of savings back to your home-country account via fintech apps (Wise/Revolut) to protect against local currency drops. Crucially, never transfer money on Fridays or weekends, as banks inject a 1% to 2% \"volatility buffer\" into exchange rates while markets are closed.", 8.5, "normal", textMain, 4);

    printLine("04. Prepare: The Legalisation Marathon", 9, "bold", primary, 1);
    printLine("This is the \"marking phase\" of the move—tedious but vital. You must navigate the notarisation chain for your target country. Scan everything to a high-resolution cloud drive before you hand over originals; you will need these digital copies for everything from local SIM cards to bank accounts.", 8.5, "normal", textMain, 4);

    printLine("05. Schools: The Ground-Truth Intel", 9, "bold", primary, 1);
    printLine("HR handles the legalities, but a 'Staff Room Buddy' handles the reality. Contact the school early to secure childcare spots, as availability is often tight. Use the 'Leaver Trick': connect with teachers who are departing this summer to buy their furniture at a discount or potentially take over their apartment lease.", 8.5, "normal", textMain, 4);

    printHeading("HEALTHCARE & REGISTRATION OPERATIONAL RISKS", 9, 2);
    printLine("• The \"Arrival Gap\": School medical policies frequently activate strictly on Day 1 of the official contract. If landing 2 weeks early for relocation, you are flying completely uninsured and must bridge this with a private travel insurance policy.", 8.5, "normal", textMain, 2);
    printLine("• Network Tier Limits: Verify if your provider card is \"Premium\" or \"General.\" General networks often entirely exclude the top-tier international emergency hospitals located nearest to expat neighborhoods.", 8.5, "normal", textMain, 2);
    printLine("• Co-Pay Realities: Basic plans often carry 20%+ co-pays for dental or outpatient visits, requiring a dedicated out-of-pocket budget for minor illnesses.", 8.5, "normal", textMain, 2);
    printLine("• Fitness for Residency: Note that the mandatory host-country medical screening (Blood tests/X-rays) is unforgiving; certain historical or chronic conditions can directly block or derail a residency permit, halting your ability to legally stay or open a bank account.", 8.5, "normal", textMain, 4);

    printLine("06. Connect: Avoiding the 'Triple-Dip'", 9, "bold", primary, 1);
    printLine("Standard SWIFT transfers hit three different banks, each taking a slice of your money. Set up multi-currency apps (like Wise or Revolut) before you land. (See Page 2 for weekend transfer restrictions).", 8.5, "normal", textMain, 6);

    printLine(`Expert Tip: In ${selectedCountry}, your residency permit is the key to everything from getting a car to home Wi-Fi. Until that physical card is in your hand, you are essentially a tourist with a very expensive hobby. Does your current contract offer a specific timeline for when they expect your residency permit to be finalised?`, 8.5, "italic", primary, 8);

    // PAGE BREAK: Page 3
    drawFooter(pageCount);
    doc.addPage();
    pageCount++;
    drawHeader("FIELD MANUAL");
    y = 35;

    // Render buffer matrix here (moved up from Page 4)
    printHeading("🛠️ PERSONALIZED STARTUP BUFFER ANALYSIS", 10, 4);
    printLine(`• Target Country: ${selectedCountry}`, 9, "normal", textMain, 2);
    printLine(`• Target School: ${schoolLabel}`, 9, "normal", textMain, 2);
    printLine(`• Deployment Profile: ${calcStatus.replace('-', ' ').toUpperCase()}`, 9, "normal", textMain, 2);
    printLine(`• The Payday Gap Horizon: ${setupDays} Days (Safety Margin)`, 9, "normal", textMain, 4);

    if (isOman) {
      printLine("TACTICAL WARNING (OMAN BANKING LOCK): Local banking, housing contracts, and car lease/rental credit facilities remain locked until your physical residency permit (residency card) is issued. Upfront cash or home-country card liquidity is absolutely critical for early operations.", 8.5, "bold", primary, 4);
    }

    const isZeroHousing = Math.round(budget.housing) === 0 || budget.isSubsidised;
    const housingText = isZeroHousing 
      ? `• Rent & Secure Deposit: £0 (Fully provided and covered by ${schoolLabel}; no personal upfront cash outlay required for baseline housing).`
      : `• Rent & Secure Deposit: £${Math.round(budget.housing).toLocaleString()} (Covers estimated first month's rent plus a standard local security deposit).`;

    printHeading(`REQUIRED ARRIVAL & SETUP RESERVE: GBP ${Math.round(totalReserve).toLocaleString()}`, 10, 4);

    printHeading("RUNWAY BREAKDOWN MATRIX:", 9.5, 3);
    printLine(`• Visas & Document Legalization: £${Math.round(budget.docs).toLocaleString()} (Estimated legal, apostille, and embassy processing fees).`, 8.5, "normal", textMain, 2);
    printLine(housingText, 8.5, "normal", textMain, 2);
    printLine(`• Living Runway (${setupDays} Days): £${Math.round(budget.expenditure).toLocaleString()} (Scaled for groceries, utilities, and daily essentials for a ${calcStatus.replace('-', ' ')} profile).`, 8.5, "normal", textMain, 2);
    printLine(`• Logistics & Excess Shipping: £${Math.round(budget.logistics).toLocaleString()} (Combined estimate for courier services and airline baggage overrides).`, 8.5, "normal", textMain, 2);
    printLine(`• Transport Setup: £${Math.round(budget.transport).toLocaleString()} (Initial public transit registration and commuting buffer).`, 8.5, "normal", textMain, 4);

    const ikeaGbp = calcStatus === 'single' ? 450 : 900;
    const ikeaLocalVal = isOman ? `${Math.round(ikeaGbp / 2.08)} OMR` : `${Math.round(budget.ikea).toLocaleString()} ${budget.displayCurrency}`;
    const ikeaText = `• Profile Essential Kit (${familyStatusLabel}): Exactly £${ikeaGbp} (approx ${ikeaLocalVal}${isOman ? ' based on a standard 1 OMR = ~2.08 GBP peg' : ''}).`;

    printHeading("🛒 THE IKEA INDEX READY-CHECK", 10, 4);
    printLine(`• Local Registry Status: Verified Active in ${selectedCountry}.`, 9, "normal", textMain, 2);
    printLine(ikeaText, 9, "normal", textMain, 2);
    printLine("• Tactical Directive: If your assigned flat is structurally \"Unfurnished\", this exact Field Kit inventory value has been automatically appended to your total Startup Buffer above to secure basic week-one living essentials (Bedding, primary cookware, basic comfort seating).", 8.5, "normal", textMain, 8);

    // NEW SECTION: THE SURPLUS TEST
    y += 8;
    const rentVal = formatCurrency(monthlyBudget.rent, budget.displayCurrency);
    const transportVal = formatCurrency(monthlyBudget.transport, budget.displayCurrency);
    const incomeVal = formatCurrency(monthlyBudget.totalIncome, budget.displayCurrency);
    const surplus7Percent = formatCurrency(monthlyBudget.totalIncome * 0.07, budget.displayCurrency);

    printHeading("THE SURPLUS TEST.", 11, 4);
    printLine(`Before you sign on the dotted line, you need to look beyond the quoted salary and perform a cold, hard stress test on your lifestyle. The Leopardfish Intel Evaluate page does this for you—it is designed to act as your financial flight simulator, letting you adjust the numbers to suit your specific circumstances now so you can arrive in ${selectedCountry} confident that finances are secure.`, 9, "normal", textMain, 4);
    printLine("To get a deep understanding of whether this deployment meets your expectations, you need to play with the costs of your new international lifestyle. Head to the evaluate page on our website and complete these steps:", 9, "normal", textMain, 6);

    const steps = [
        "1. Input the Offered Net Salary: Enter the exact figure from your contract into the Monthly Net Salary field.",
        "2. Plug in the 'Home commitments': Use the Custom Adjustments section to account for every penny that leaves your account for home-country commitments. This includes UK mortgages, student loans, and your Class 3 NI contributions.",
        "3. Add in any additional partner income or any tutor or management allowances that boost the net salary already entered.",
        "4. Analyse the Result: The calculator will output your Monthly Disposable Surplus.",
        `5. Review the surplus: If you are not achieving a 10% surplus (for example, if it is around 7%, e.g., ${surplus7Percent}), the tool will flag this as "Limited Potential".`,
        "6. This is an invaluable negotiation or budgeting tool: If the surplus is negative or simply \"not enough\" to meet your savings goals, the mission—as currently framed—will not work for you. Adjustments will need to be made or other opportunities considered."
    ];
    steps.forEach(s => printLine(s, 8.5, "normal", textMain, 3));

    y += 6;
    printHeading("Tuning the Dials: The 'What-If' Scenarios", 10, 4);
    printLine("If the initial numbers look grim, don't panic. Use the tool to find the \"path to green\" by adjusting your variables:", 9, "normal", textMain, 4);

    printLine(`• Housing Adjustments: Could you downgrade from a 3-bed residence (${rentVal}) to a smaller flat to reclaim some surplus?`, 8.5, "normal", textMain, 2);
    printLine("• The Partner Variable: If you are moving with a spouse, input a Partner Net Salary. Often, a second income is the difference between \"just surviving\" and \"thriving\".", 8.5, "normal", textMain, 2);
    printLine(`• The 4x4 Necessity: Notice the Transport field (${transportVal}). In regions like Oman, infrastructure is built for cars; a 4x4 is a non-negotiable "infrastructure tax" for a family. Don't try to "save" money here by pretending you'll take the bus—it won't happen. Downgrading to a sedan will help, but limits your adventures.`, 8.5, "normal", textMain, 2);
    printLine(`• Home-Country Cuts: Can you reduce your "Home Anchors"? Adjusting your custom commitments might be the only way to make a tight ${incomeVal} salary viable.`, 8.5, "normal", textMain, 8);

    printLine(`Peer Advice: Use this page to find your "Breaking Point." If you have to downgrade your lifestyle to a level you'll hate just to save £200 a month, the mission is a fail. Use these results to fuel your negotiation email—if the surplus is too low, you have the data to prove why you need a higher salary step.`, 9, "italic", primary, 10);

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

    printHeading("PART 5: A ROOF OVER YOUR HEAD (HOUSING)", 10, 4);
    printLine("Unless the school is putting you in a fully furnished flat, the housing hunt is your biggest hurdle.", 9, "normal", textMain, 4);
    printLine("The Hotel Trap: If the school provides temporary housing, ask if they settle the bill directly. If you have to pay upfront and claim it back, you must add this cost as an 'Override' in the Rent section of the dashboard to ensure your reserve is accurate.", 9, "normal", textMain, 4);
    printLine("The Inquisitive Question: 'Does the school settle the temporary hotel bill directly, or am I expected to pay upfront and claim it back?'", 9, "italic", primary, 8);

    printHeading("PART 6: HR SUPPORT (EXPECTATIONS VS. REALITY)", 10, 4);
    printLine("Your school's HR department is managing the arrival of multiple new teachers simultaneously. They are stretched thin.", 9, "normal", textMain, 4);
    printLine("The Reality: They will handle the legalities-visas, Ministry of Education approvals, local bank letters. They will not hold your hand to set up your home WiFi, buy your groceries, or argue with your new landlord about a leaky tap.", 9, "normal", textMain, 4);
    printLine("The Staff Room Buddy: Ask to be assigned a 'Buddy'-a current teacher in your department. HR deals with policy; your Buddy deals with reality.", 9, "normal", textMain, 4);
    printLine("The Inquisitive Question: 'Would it be possible to be put in touch with a current teacher in my department? I'd love to ask a few informal, practical questions about life on the ground before I pack.'", 9, "italic", primary, 8);

    drawFooter(pageCount);
    doc.addPage();
    pageCount++;
    drawHeader("PAGE 6");
    y = 35;

    printHeading("Relocation Checklist", 10, 4);
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

    drawFooter(pageCount);
    doc.addPage();
    pageCount++;
    drawHeader("PAGE 7");
    y = 35;

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

  if (!mounted || isLoadingSchools) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-[#d95f02]" /></div>;

  return (
    <div 
      className="container mx-auto px-4 md:px-12 py-10 text-white bg-[#020617] min-h-screen font-sans"
      style={{ '--primary': '#d95f02' } as React.CSSProperties}
    >
      
      {/* Header */}
      <div className="mb-4 space-y-1">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic leading-none uppercase">
          The ultimate <span className="text-[#d95f02]">arrival plan.</span>
        </h1>
        <p className="text-[#94a3b8] font-bold text-[14px] tracking-[0.05em] opacity-80 italic">Because improvising is a great strategy for a Friday afternoon lesson, but a terrible one for international relocation.</p>
      </div>

      {/* 🛰️ MISSION BRIEFING: THE FLI007 ARRIVAL PLAN */}
      <section className="border-b-2 border-white/5 pb-8 mb-6 mt-2">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[#d95f02] font-black text-[14px] italic tracking-[0.2em] uppercase">The Ultimate Arrival Plan for</p>
            <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">FRED FLI007</h2>
            <p className="text-[15px] font-bold text-slate-400 italic max-w-xl leading-relaxed">
              Your Essential Relocation Briefing. Grounded in Leopardfish Intel.
            </p>
          </div>
          <Button 
            className="bg-black hover:bg-[#d95f02] hover:text-black text-white border-2 border-[#d95f02] font-black text-xs uppercase italic px-10 h-14 rounded-none transition-all group flex items-center gap-3"
            onClick={() => setIsConfirmModalOpen(true)}
          >
            <Lock className="size-4 group-hover:hidden" />
            <Download className="size-4 hidden group-hover:block" />
            Generate PDF Briefing
          </Button>
        </div>
      </section>

      {/* 🛡️ MISSION PHASE: STEP 01 */}
      <div className="mb-4">
        <button 
          onClick={() => setStep1Open(!step1Open)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Search className="size-5 text-sky-400" />
            <h3 className="text-[16px] font-black uppercase tracking-[0.2em] text-slate-200">Step 1. Scrutinise the contract package</h3>
          </div>
          {step1Open ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step1Open && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 space-y-4">
              <p className="text-[15px] font-bold text-slate-300 leading-relaxed w-full">
                It’s incredibly easy to get distracted by the flash of a high, tax-free salary, but you really do need to weigh up the whole package to see what an international move is actually worth. For starters, you’ll want to check that your onboarding and relocation allowances cover the practical reality of moving your life, whilst keeping a sharp eye out for gaps in your medical insurance—like dental or outpatient fees—that could leave you seriously out of pocket.
              </p>
              <p className="text-[15px] font-bold text-slate-300 leading-relaxed w-full">
                For British teachers, the biggest hurdle is that most schools don’t offer a pension, meaning you’ll need to fund your own retirement back home to make up for the loss of the TPS. If you’re a US citizen, “tax-free” is a bit of a myth anyway, as you’ll still have to navigate IRS filing requirements and the Foreign Earned Income Exclusion on your global income. Meanwhile, other nationalities must tread carefully around their own home country’s strict tax residency rules to avoid a nasty surprise bill when they return.
              </p>
              <p className="text-[15px] font-bold text-slate-300 leading-relaxed w-full">
                Because of this DIY approach to retirement, the wording of your end-of-service gratuity becomes absolutely vital. If it’s only calculated on your basic pay rather than your total package, your final “thank you” payout might be a lot smaller than you’d hoped. Below, we take a deeper look at the implications...
              </p>
            </div>

          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 1A — RUN THE SURPLUS TEST */}
      <div className="mb-4 ml-6 md:ml-12 border-l-2 border-sky-400/20 pl-4 md:pl-6">
        <button
          onClick={() => setStep1aOpen(!step1aOpen)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Activity className="size-5 text-sky-400" />
            <p className="text-[16px] font-black tracking-[0.2em] text-slate-300">Step 1a. Run the Surplus Test</p>
          </div>
          {step1aOpen ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step1aOpen && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 relative group hover:border-sky-400/40 transition-all">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="size-5 text-sky-400" />
                  <p className="text-[16px] font-black uppercase tracking-[0.2em] text-sky-400">The Surplus Test</p>
                </div>
                <p className="text-[15px] font-bold text-slate-300 leading-relaxed w-full">
                  Before you sign on the dotted line, you need to look beyond the quoted salary and perform a cold, hard stress test on your lifestyle. The Leopardfish Intel allows you these insights — letting you adjust the numbers to suit your specific circumstances now so you can arrive in {selectedCountry !== 'all' ? selectedCountry : 'Oman'} confident that finances are secure.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Target className="size-4 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">How to find your surplus</h4>
                      </div>
                      <p className="text-[13px] font-bold text-slate-400 leading-relaxed">
                        Navigate to the Evaluate page to play with the costs of your new international lifestyle and complete these steps:
                      </p>
                      
                      {/* Visual Stepper Checklist */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 1, title: "Input the Net Salary", desc: `Enter the exact monthly net salary figure from your contract on the Evaluate page.` },
                          { id: 2, title: "Plug in Home Anchors", desc: `Use custom adjustments to account for home-country commitments like mortgages or student loans.` },
                          { id: 3, title: "Add Partner Income", desc: `Incorporate any additional partner net income or tutoring allowances that boost your monthly earnings.` },
                          { id: 4, title: "Review the Surplus", desc: `If you are not achieving at least a 10% surplus, the system will flag the contract as Limited Potential.` },
                          { id: 5, title: "Negotiation Prep", desc: `Use any savings gaps to determine the exact contract uplift required to make deployment viable.` },
                          { id: 6, title: "Lock in the Profile", desc: `Save your profile metrics to secure your baseline runway for future PDF manual generation.` }
                        ].map(item => (
                          <div key={item.id} className="p-4 bg-black/40 border border-white/5 hover:border-sky-400/30 transition-all flex flex-col justify-between h-full">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="flex items-center justify-center size-5 rounded-full bg-sky-400/10 text-sky-400 font-mono font-black text-[10px] border border-sky-400/30">
                                  {item.id}
                                </span>
                                <p className="text-[12px] font-black text-white uppercase tracking-wider">{item.title}</p>
                              </div>
                              <p className="text-[11px] font-bold text-slate-400 leading-snug">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
 
                    {/* Launch Evaluate Dashboard CTA */}
                    <div className="pt-4 flex border-t border-sky-400/10">
                      <Link 
                        href="/financial-forecaster"
                        className="bg-black hover:bg-sky-400 hover:text-black text-white border-2 border-sky-400 font-black text-xs italic px-6 h-12 rounded-none transition-all flex items-center gap-2 justify-center"
                      >
                        <ArrowUpRight className="size-4" /> Launch Evaluate Dashboard
                      </Link>
                    </div>
                  </div>
 
                  {/* Right Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-6">
                       <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                         <Compass className="size-4 text-sky-400" />
                         <h4 className="text-[14px] font-black uppercase tracking-widest text-white">The 'What-If' Scenarios</h4>
                       </div>
                       
                       <p className="text-[13px] font-bold text-slate-400 leading-relaxed">
                         If the initial numbers look grim, don't panic. Adjust your inputs to find the "path to surplus" on the Evaluate page:
                       </p>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {[
                           { label: "Housing adjustments", desc: `Could you downgrade from your current estimate (${formatCurrency(monthlyBudget.rent, budget.displayCurrency)}) to reclaim some surplus?` },
                           { label: "The partner variable", desc: "If relocating with a partner, input their income. A second salary is often the difference between struggling and thriving." },
                           { label: "The 4x4 necessity", desc: `In desert sectors like ${selectedCountry !== 'all' ? selectedCountry : 'Oman'}, a 4x4 vehicle is a non-negotiable family cost (approx ${formatCurrency(monthlyBudget.transport, budget.displayCurrency)}).` },
                           { label: "Home-country cuts", desc: `Can you reduce your home anchors? Trimming custom commitments is sometimes the only path to a viable surplus.` },
                           { label: "Utilities spikes", desc: "Air conditioning or winter heating spikes can decimate a tight surplus. Always run a worst-case utility calculation." },
                           { label: "Runway extension", desc: "If initial savings are low, extend your setup timeline from 45 to 60 days to verify required reserves." }
                         ].map((item, i) => (
                           <div key={i} className="p-4 bg-black/40 border border-white/5 hover:border-sky-400/30 transition-all flex flex-col justify-between h-full">
                             <div>
                               <p className="text-[12px] font-black text-sky-400 uppercase tracking-wider mb-2">{item.label}</p>
                               <p className="text-[11px] font-bold text-slate-400 leading-snug">{item.desc}</p>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
 
                    <div className="pt-3 border-t border-sky-400/10">
                      <p className="text-[12px] font-bold text-slate-500 leading-relaxed italic">
                        <span className="text-sky-400 font-black uppercase tracking-widest not-italic block mb-1">Peer Advice:</span>
                        "Use this page to find your 'Breaking Point.' If you have to downgrade your lifestyle to a level you'll hate just to save £200 a month, the mission is a fail. Use these results to fuel your negotiation email."
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 1B — EVALUATE PAY SCALES AND NDAS */}
      <div className="mb-4 ml-6 md:ml-12 border-l-2 border-sky-400/20 pl-4 md:pl-6">
        <button
          onClick={() => setStep1bOpen(!step1bOpen)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Banknote className="size-5 text-sky-400" />
            <p className="text-[16px] font-black tracking-[0.2em] text-slate-300">Step 1b. Evaluate Pay Scales and NDAs</p>
          </div>
          {step1bOpen ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step1bOpen && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 relative group hover:border-sky-400/40 transition-all">
              <div className="space-y-6">
                
                {/* Row 1: Side by Side Pay Scale Warnings & Best Practices */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card - Pay Scales Warnings */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Banknote className="size-5 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Pay Scales - The Warnings</h4>
                      </div>
                      <div className="space-y-4">
                        {[
                          { title: "Negotiable Salary", desc: "Top schools use fixed grids. Negotiation implies a lack of transparency and usually results in pay gaps." },
                          { title: "Vague Broad Ranges", desc: "A massive range without a clear ladder is often a bait-and-switch designed to lowball you." },
                          { title: "The Secret Grid", desc: "Refusal to show the scale until the contract stage usually hides a lack of guaranteed raises." },
                          { title: "Profit-First Chains", desc: "Lower-tier schools view your salary as a cost to be cut for shareholders." }
                        ].map((item, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">{item.title}</p>
                            <p className="text-[12px] font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column Card - Pay Scales Best Practice */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <ShieldCheck className="size-5 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Pay Scales - The Best Practice</h4>
                      </div>
                      <div className="space-y-4">
                        {[
                          { title: "A Transparent Grid", desc: "A public table showing exactly what you earn based on your years of experience and degrees." },
                          { title: "Automatic Annual Steps", desc: "A guaranteed pay bump every year you stay at the school, protecting your real income." },
                          { title: "Degree Differentials", desc: "Clear, higher pay brackets for holding an MA or PhD, acknowledging your expertise." },
                          { title: "Benefit Clarity", desc: "Explicit details on housing, flights, and tax obligations provided before you even interview." }
                        ].map((item, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">{item.title}</p>
                            <p className="text-[12px] font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Row 2: Side by Side NDA Clauses & Expert Tip */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card - NDA Clauses */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Lock className="size-4 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">NDA Clauses</h4>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                        Check restrictions on discussing pay or the school climate. If you're banned from talking about your salary with colleagues, it's usually because the school is hiding major pay disparities.
                      </p>
                    </div>
                  </div>

                  {/* Right Column Card - Expert Tip */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Info className="size-4 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Expert Tip</h4>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 leading-relaxed italic">
                        "Always ask for the scale during the first interview. If they get defensive, you've already found your answer. Professional schools are proud of their transparency."
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 1C — EVALUATE ACCOMMODATION */}
      <div className="mb-4 ml-6 md:ml-12 border-l-2 border-sky-400/20 pl-4 md:pl-6">
        <button
          onClick={() => setStep1cOpen(!step1cOpen)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Home className="size-5 text-sky-400" />
            <p className="text-[16px] font-black tracking-[0.2em] text-slate-300">Step 1c. Evaluate Accommodation</p>
          </div>
          {step1cOpen ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step1cOpen && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 relative group hover:border-sky-400/40 transition-all">
              <div className="space-y-6">
                
                {/* Row 1: Side by Side Accommodation Warnings & Best Practices */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card - Accommodation Warnings */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Home className="size-5 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Accommodation - The Warnings</h4>
                      </div>
                      <div className="space-y-4">
                        {[
                          { title: "The Commute Trap", desc: "Locations 45+ minutes from campus turns your free time into hours of unpaid travel." },
                          { title: "Vague Suitability Clauses", desc: "Describing housing as suitable without photos or square footage can hide substandard units." },
                          { title: "The Furniture Gap", desc: "Providing unfurnished flats without a settling-in allowance. You'll spend months of salary just buying a bed." },
                          { title: "Mandatory Sharing", desc: "Asking teachers to share apartments. This represents a lack of professional boundaries for adult staff." }
                        ].map((item, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">{item.title}</p>
                            <p className="text-[12px] font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column Card - Accommodation Best Practice */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <ShieldCheck className="size-5 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Accommodation - The Best Practice</h4>
                      </div>
                      <div className="space-y-4">
                        {[
                          { title: "The Opt-Out Choice", desc: "Choice between a managed flat OR a fair-market cash allowance. This proves their housing value is honest." },
                          { title: "Household-Based Allocation", desc: "Entitlement policies (size/bedrooms) scale automatically based on the number of your dependents." },
                          { title: "Transparency & Tours", desc: "Providing floor plans, actual photos (not marketing shots), and a video walkthrough of your specific unit." },
                          { title: "The Welcome Pack", desc: "A fridge stocked with essentials and pre-connected internet. It signals a school that prioritizes well-being." }
                        ].map((item, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">{item.title}</p>
                            <p className="text-[12px] font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Row 2: Side by Side The Housing Spectrum & Expert Tip */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card - The Housing Spectrum */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Package className="size-5 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">The Housing Spectrum</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Furnished</p>
                          <p className="text-[11px] font-bold text-slate-400 leading-relaxed">Includes big ticket items (Sofa, Bed, Dining). Check if it includes softs (linens/kitchenware).</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Unfurnished</p>
                          <p className="text-[11px] font-bold text-slate-400 leading-relaxed">Usually includes White Goods (Fridge/Stove) only. Must come with a cash Settling-in Allowance.</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Allowances</p>
                          <p className="text-[11px] font-bold text-slate-400 leading-relaxed">Monthly cash. Ensure it covers 100% of local rent + at least 70% of average utility costs.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Card - Expert Tip */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Info className="size-4 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Expert Tip</h4>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 leading-relaxed italic">
                        "Ask to speak with the teacher currently living in these units. Ask about the three things the school won't tell you: internet reliability, water pressure, and noise levels at 6:00 AM."
                      </p>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 02 */}
      <div className="mb-6">
        <button 
          onClick={() => setStep2Open(!step2Open)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Coins className="size-5 text-sky-400" />
            <h3 className="text-[16px] font-black uppercase tracking-[0.2em] text-slate-200">Step 2. Calculate your startup buffer</h3>
          </div>
          {step2Open ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step2Open && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20">
              <p className="text-[15px] font-bold text-slate-300 italic leading-relaxed w-full">
                This isn't just about the flight; it depends heavily on whether you're landing in a furnished flat or facing an empty apartment in a country where IKEA is a four-hour drive away. Check your contract—'unfurnished' can mean different things in different regions. 
                <span className="block mt-2 text-sky-400/80">
                  The input fields below are dynamic and can be adjusted to suit your specific situation. While current figures represent median LeopardfishIntel regional and school estimates, school-specific benefits (like hotel stays or flight caps) can significantly shift these outcomes. Please adjust data fields to reflect your personalised offer.
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto space-y-5 mb-6">
        
        {/* Tactical Warning Alert Moved Down */}
        
        {/* ROW 1: Details & Dashboard (Height Matched) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-4 flex">
            <Card className="bg-[#0b1224] border-white/10 p-6 w-full space-y-5 flex flex-col justify-center">
              <h3 className="text-[12px] font-black text-[#d95f02] tracking-widest uppercase italic underline underline-offset-8 mb-2">Your details</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-bold text-slate-500 italic">1. Which country?</Label>
                  <Select value={selectedCountry} onValueChange={(val: string) => { setSelectedCountry(val); setSelectedSchoolId(null); }}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[12px] font-black italic text-[#fafaf9]"><SelectValue placeholder="Select country..." /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      <SelectItem value="all">Everywhere</SelectItem>
                      {availableCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px] font-bold text-slate-500 italic">2. Which school?</Label>
                  <Select value={selectedSchoolId ?? ''} onValueChange={(val: string) => setSelectedSchoolId(val)}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[12px] font-black italic text-[#fafaf9]"><SelectValue placeholder="Pick your school..." /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      {filteredSchools.map(s => <SelectItem key={s.id} value={s.id}>{s.schoolname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <Label className="text-[12px] font-bold text-slate-500 italic">3. Family status</Label>
                  <Select value={calcStatus} onValueChange={(val: string) => setCalcStatus(val)}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[12px] font-black italic text-[#fafaf9]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married-dual">Married (dual income)</SelectItem>
                      <SelectItem value="married-sole">Married (sole earner)</SelectItem>
                      <SelectItem value="family-1">Family (1 child)</SelectItem>
                      <SelectItem value="family-2">Family (2 children)</SelectItem>
                      <SelectItem value="family-3">Family (3+ children)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <Label className="text-[13px] font-bold text-slate-500 italic">4. Home commitments?</Label>
                  <div className="relative">
                    <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-sky-400" />
                    <Input 
                      type="number" 
                      value={monthlyCommitments || ''} 
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setMonthlyCommitments(Number(e.target.value))}
                      placeholder="e.g. Loans/Pensions"
                      className="bg-black/40 border-white/10 h-10 pl-7 text-[14px] font-black italic text-[#fafaf9] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <p className="text-[12px] font-bold text-slate-600 italic">Include student loans, mortgages and any pension contributions...</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex">
            <div className="bg-[#0b1224] border border-white/10 rounded-sm shadow-2xl w-full flex flex-col">
              {/* 🏔️ DASHBOARD TOP: Primary Intelligence */}
              <div className="relative bg-gradient-to-br from-[#0b1224] to-[#020617] p-6 lg:p-8 border-b border-white/5">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Zap className="absolute -top-10 -right-10 size-96 opacity-[0.03] rotate-12 text-white" />
                </div>
                
                {/* 🛰️ DATA HIERARCHY */}
                {/* 🛰️ ROW 1: PRIMARY INTELLIGENCE */}
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  
                  {/* Reserve Counter */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="text-[14px] font-black text-[#d95f02] tracking-[0.4em] uppercase leading-none italic whitespace-nowrap">Arrival & setup reserve</p>
                    </div>
                    <p className={cn(
                      "font-black italic tracking-tighter leading-none transition-all duration-300 drop-shadow-2xl",
                      totalReserve > 9999 ? "text-5xl lg:text-6xl" : "text-6xl lg:text-7xl"
                    )}>
                      {formatCurrency(totalReserve, budget.displayCurrency)}
                    </p>
                    
                    {/* Tactical Currency Switcher */}
                    <div className="flex bg-black/60 backdrop-blur-md rounded-none p-0.5 border border-white/10 w-fit mt-3">
                      {['GBP', 'USD', 'EUR', 'Local'].map((c) => (
                        <button
                          key={c}
                          disabled={c === 'Local' && selectedCountry === 'all'}
                          onClick={() => setCurrency(c)}
                          className={cn(
                            "px-3 py-1 text-[13px] font-black transition-all uppercase",
                            currency === c ? "bg-[#d95f02] text-white" : "text-slate-500 hover:text-white disabled:opacity-20"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Operational Inputs (Top Tier - Vertically Stacked) */}
                  <div className="flex flex-col gap-4 w-full lg:w-auto">
                    <div className="space-y-1 min-w-[250px] relative group/payday">
                      <Label className="text-[12px] font-black text-white italic flex items-center gap-2 uppercase tracking-[0.2em] mb-1">
                        THE PAYDAY GAP
                        <div className="group relative">
                          <Info className="size-3 text-sky-400 cursor-help" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-black border border-white/10 rounded-sm text-[13px] font-bold text-slate-300 leading-tight italic opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                            Paperwork delays often push your first pay to the 60-day mark. Select your realistic arrival window.
                          </div>
                        </div>
                      </Label>
                      <Select value={setupDays} onValueChange={(val: string) => setSetupDays(val)}>
                        <SelectTrigger className="bg-black/60 border-[#d95f02] h-16 text-[18px] font-black italic text-white rounded-none focus:ring-[#d95f02] shadow-[0_0_15px_rgba(249,115,22,0.15)] animate-pulse transition-all hover:animate-none hover:border-[#d95f02] hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                          <SelectItem value="30" className="py-3 px-4 focus:bg-white focus:text-black">30 DAYS <span className="text-[12px] opacity-60 ml-2">(ON TIME)</span></SelectItem>
                          <SelectItem value="45" className="py-3 px-4 focus:bg-white focus:text-black">45 DAYS <span className="text-[12px] opacity-60 ml-2">(REALISTIC)</span></SelectItem>
                          <SelectItem value="60" className="py-3 px-4 focus:bg-white focus:text-black">60 DAYS <span className="text-[12px] opacity-60 ml-2">(SAFETY MARGIN)</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 min-w-[150px]">
                      <Label className="text-[13px] font-bold text-slate-500 italic uppercase tracking-widest">Arrival allowances?</Label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#d95f02]" />
                        <Input 
                          type="number" 
                          value={arrivalAllowance || ''} 
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setArrivalAllowance(Number(e.target.value))}
                          placeholder="e.g. 1500"
                          className="bg-black/60 border-white/10 h-12 pl-10 text-[14px] font-black italic text-[#fafaf9] rounded-none focus-visible:ring-[#d95f02] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 📊 ROW 2 & 3: SECONDARY INPUTS & BREAKDOWN STATS (Consistently Boxed) */}
              <div key={setupDays} className="p-5 lg:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 bg-black/20 border-t border-white/5 animate-in fade-in duration-700 slide-in-from-bottom-1">
                
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
                      className="p-1 px-2 text-[12px] font-black uppercase italic text-sky-400 hover:text-white transition-colors bg-sky-400/10 border border-sky-400/20 rounded-none z-10 whitespace-nowrap"
                    >
                      {showElectronicsKit ? 'Close' : 'Select'}
                    </button>
                  }
                />

                {/* 🔌 Electronics Genkit Expandable (Inline for Mobile UX) */}
                {showElectronicsKit && (
                  <div className="col-span-full mb-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-sky-400/5 border border-sky-400/20 p-4 relative">
                      <button 
                        onClick={() => setShowElectronicsKit(false)}
                        className="absolute top-3 right-3 text-sky-400 hover:text-white transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                      <div className="flex items-center justify-between mb-3 border-b border-sky-400/10 pb-2 pr-8">
                        <p className="text-[12px] font-black text-sky-400 uppercase tracking-[0.3em] italic flex items-center gap-2">
                          <Monitor className="size-3" /> SELECT GENKIT ITEMS
                        </p>
                        <p className="text-[12px] font-black italic text-slate-500">Live Estimate: £{electronicsTotal}</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
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
                            <span className="text-[12px] font-black uppercase tracking-wider">{item.name}</span>
                            <span className="text-[12px] font-bold italic opacity-60">£{item.cost}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-[12px] font-black text-slate-600 uppercase tracking-widest italic">
                          * Tactical Genkit build complete. Selected items accumulated in mission reserve.
                        </p>
                        <p className="text-[12px] font-bold text-slate-600 italic">
                          Regional averages in GBP applied.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <StatItem 
                  label="Transport" 
                  value={budget.transport} 
                  icon={Car} 
                  currency={budget.displayCurrency} 
                  overrideValue={transportOverride}
                  onOverride={(val) => setTransportOverride(val)}
                  info={transportMode === 'drive' ? "Estimated cost for short-term car hire and fuel for your setup period. It is typically too early to purchase a car before residency is granted." : (transportMode === 'taxi' ? "Estimated cost for daily ride-share/taxi trips for the duration of your setup period." : "Estimated cost for public transport passes and initial commute setup.")}
                />
                
                {budget.family > 0 && (
                  <StatItem 
                    label="Family/Childcare" 
                    value={budget.family} 
                    icon={Baby} 
                    currency={budget.displayCurrency} 
                    overrideValue={familyOverride}
                    onOverride={(val) => setFamilyOverride(val)}
                    info="Estimated costs for school uniforms and initial childcare deposits. Rates vary wildly—verify local availability and school subsidies early."
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



              {/* 🔄 Reset Row */}
              <div className="px-8 pb-8 flex justify-end">
                <button 
                  onClick={resetToDefaults}
                  className="text-[12px] font-black text-[#d95f02] hover:text-[#00e5ff] uppercase tracking-widest italic transition-colors"
                >
                  Reset all overrides to LeopardfishIntel defaults
                </button>
              </div>
            </div>
          </div>
        </div>



        {/* Tactical Warning Alert (New Position) */}


        {/* ROW 2: IKEA Readiness (Full Width) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-12 flex flex-col gap-3">
            <Card className={cn("border-white/10 p-4 w-full shadow-lg transition-all", selectedCountry !== 'all' ? "bg-[#0b1224]" : "bg-slate-900/50 opacity-50")}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* 🏷️ Title & Status */}
                <div className="flex items-center gap-4 min-w-[280px]">
                  {(() => {
                    const hasIkea = selectedIkea && (() => {
                      const ikeaKey = Object.keys(selectedIkea).find(k => k.toLowerCase().includes('ikea'));
                      if (ikeaKey) {
                        const val = selectedIkea[ikeaKey];
                        if (val !== undefined && val !== null && val !== "" && !['0', 'no', 'false', 'n', 'f'].includes(String(val).toLowerCase().trim())) return true;
                      }
                      const altKeys = ['Has Ikea', 'Has IKEA', 'Has_Ikea', 'hasIkea', 'Ikea', 'IKEA'];
                      for (const k of altKeys) {
                        const val = selectedIkea[k];
                        if (val !== undefined && val !== null && val !== "" && !['0', 'no', 'false', 'n', 'f'].includes(String(val).toLowerCase().trim())) return true;
                      }
                      return false;
                    })();
                    return (
                      <>
                        <div className={cn(
                          "p-2.5 rounded-full", 
                          hasIkea ? "bg-green-500/10 text-green-500" : (selectedIkea ? "bg-rose-500/10 text-rose-500" : "bg-[#d95f02]/10 text-[#d95f02]")
                        )}>
                          <ShoppingCart className="size-5" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-black uppercase tracking-widest text-white italic leading-none">
                            IKEA readiness check: <span className="text-sky-400 underline decoration-sky-400/30 underline-offset-4">{selectedCountry !== 'all' ? selectedCountry : 'Your destination'}</span>
                          </h4>
                          <p className="text-[12px] font-bold text-slate-500 tracking-tight italic mt-1 leading-none">
                            {selectedIkea 
                              ? (hasIkea ? "Verified local IKEA presence." : "Using regional estimates.")
                              : "Standard furnishing estimate."}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* 📊 Stats, Currency & Actions */}
                {selectedIkea && (
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-6 flex-1 justify-end">
                    {(() => {
                      let targetLocalCurrency = selectedIkea['Currency'] || 'USD';
                      if (targetLocalCurrency === 'Local' || targetLocalCurrency === 'local' || !targetLocalCurrency) targetLocalCurrency = 'USD';
                      const activeIkeaCurrency = ikeaDisplayCurrency === 'Local' ? targetLocalCurrency : ikeaDisplayCurrency;
                      
                      const tierMap = [
                        { label: 'Single', key: 'Single', status: 'single' },
                        { label: 'Couple', key: 'Couple', status: 'married-dual' },
                        { label: 'Family +1', key: 'Family +1', status: 'family-1' },
                        { label: 'Family +2', key: 'Family +2', status: 'family-2' },
                        { label: 'Family +3', key: 'Family +3', status: 'family-3' },
                      ];
                      
                      const activeTier = tierMap.find(t => t.status === calcStatus || (t.status === 'married-dual' && calcStatus === 'married-sole')) || tierMap[0];
                      const usdVal = Number(selectedIkea[activeTier.key]) || 1000;
                      const rate = RATES[activeIkeaCurrency] || 1.0;
                      const displayVal = (usdVal / (RATES['USD'] || 1.27)) * rate;

                      return (
                        <>
                          {/* Active Stat */}
                          <div className="flex items-center gap-2 px-4 py-2 bg-sky-400/10 border border-sky-400/30 italic">
                            <span className="text-[12px] font-bold text-sky-400 uppercase tracking-tighter opacity-60">{activeTier.label}:</span>
                            <span className="text-[14px] font-black text-white">{formatCurrency(displayVal, activeIkeaCurrency)}</span>
                          </div>

                          {/* Currency Switcher */}
                          <div className="flex items-center gap-3">
                            <span className="text-slate-600 font-black text-[12px] uppercase tracking-widest italic flex-shrink-0">CURRENCY:</span>
                            <div className="flex bg-black/40 p-0.5 border border-white/10 rounded-sm">
                              {['Local', 'GBP', 'USD', 'EUR'].map((c) => (
                                <button 
                                  key={c}
                                  onClick={() => setIkeaDisplayCurrency(c)}
                                  className={cn(
                                    "px-2 py-1 text-[12px] font-black tracking-tighter transition-all", 
                                    ikeaDisplayCurrency === c ? "bg-sky-400 text-black" : "text-slate-500 hover:text-white"
                                  )}
                                >
                                  {c === 'Local' ? targetLocalCurrency : c}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-8 w-px bg-white/10 hidden lg:block" />

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setShowIkeaKit(!showIkeaKit)}
                              className={cn(
                                "h-8 px-4 text-[12px] font-black uppercase italic tracking-widest transition-all border",
                                showIkeaKit ? "bg-sky-400 text-black border-sky-400" : "bg-black/40 text-sky-400 border-sky-400/30 hover:bg-sky-400/10"
                              )}
                            >
                              KIT
                            </button>
                            <button 
                              onClick={downloadIkeaPdf}
                              className="h-8 bg-sky-400 hover:bg-sky-500 text-black border-none rounded-none text-[12px] font-black italic uppercase px-4 flex items-center gap-2 transition-all"
                            >
                              <Download className="size-3" /> PDF
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {!selectedIkea && selectedCountry !== 'all' && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowIkeaKit(!showIkeaKit)}
                      className={cn(
                        "h-8 px-4 text-[12px] font-black uppercase italic border transition-all",
                        showIkeaKit ? "bg-sky-400 text-black border-sky-400" : "border-white/10 hover:bg-white hover:text-black"
                      )}
                    >
                      KIT
                    </button>
                    <button 
                      onClick={downloadIkeaPdf}
                      className="h-8 px-4 text-[12px] font-black uppercase italic bg-sky-400 text-black hover:bg-white transition-all flex items-center gap-2"
                    >
                      <Download className="size-3" /> PDF
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* IKEA COMPACT VIEW */}
            {showIkeaKit && selectedCountry !== 'all' && (
              <div className="bg-[#0b1224] border border-sky-400/20 p-6 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <h5 className="text-[12px] font-black text-sky-400 uppercase tracking-[0.3em] italic">
                    {selectedIkea ? "Basic startup essentials (IKEA)" : "Basic startup essentials (Generic)"}
                  </h5>
                  <p className="text-[12px] font-bold text-slate-500 italic">Total Items: {IKEA_KIT_ITEMS.length}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                  {IKEA_KIT_ITEMS.map((item, idx) => {
                    const qKey = calcStatus === 'married-sole' ? 'married-dual' : calcStatus;
                    const quantity = (item.q as any)[qKey] || 1;
                    const itemName = selectedIkea ? item.name : item.generic;
                    return (
                      <div key={idx} className="flex items-center justify-between text-[12px] font-bold text-slate-300 italic opacity-80 border-b border-white/5 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[#d95f02]">●</span> {itemName}
                        </div>
                        <span className="text-sky-400 font-black">x{quantity}</span>
                      </div>
                    );
                  })}
                </div>


                <p className="mt-6 text-[12px] font-bold text-slate-600 uppercase italic tracking-widest border-t border-white/5 pt-3">
                  {selectedIkea 
                    ? "* Note: This is a standardized IKEA field kit. Stock levels may vary by region."
                    : "* Note: This is a recommended essentials inventory for countries without a verified IKEA."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🛡️ MISSION PHASE: STEP 03 */}
      <div className="mb-6">
        <button 
          onClick={() => setStep3Open(!step3Open)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-sky-400" />
            <h3 className="text-[16px] font-black uppercase tracking-[0.2em] text-slate-200">Step 3. Start the paperwork</h3>
          </div>
          {step3Open ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step3Open && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20">
              <p className="text-[15px] font-bold text-slate-300 italic leading-relaxed w-full">
                This is where the excitement of the move meets the reality of global bureaucracy. Degree certificates, police checks, and embassy legalisation take time and significant upfront cash—often more than you’d expect for a pile of paper. 
                <span className="block mt-2 text-sky-400/80">
                  Tactical Advice: Start this the second you sign your contract. Do not wait for HR to chase you; a delay in your police check can push your residency permit—and your first payday—back by weeks. If you aren't already legalised, you aren't really moving.
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 3A — THE ESSENTIALS */}
      <div className="mb-4 ml-6 md:ml-12 border-l-2 border-sky-400/20 pl-4 md:pl-6">
        <button
          onClick={() => setStep3aOpen(!step3aOpen)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-sky-400" />
            <p className="text-[16px] font-black tracking-[0.2em] text-slate-300">Step 3a. Start the Paperwork (The Essentials)</p>
          </div>
          {step3aOpen ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step3aOpen && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 relative group hover:border-sky-400/40 transition-all">
              <div className="space-y-6">
                <p className="text-[14px] font-bold text-slate-300 leading-relaxed">
                  To navigate the required international paperwork, you need to manage three moving parts: authenticity, validity, and legal right to work.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Degree Attestation (The "Stamps")</p>
                        <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                          <span className="text-white">What:</span> Proving your degree isn't a forgery. Requires a chain of signatures: Notary → Home Government → Host Embassy.<br/>
                          <span className="text-white">Validity:</span> Permanent for that specific country once completed.<br/>
                          <span className="text-sky-400/80 uppercase text-[10px] font-black">Teacher Tip:</span> Never send your original degree by standard mail; use tracked couriers only.
                        </p>
                      </div>
                      <div className="space-y-1 pt-3 border-t border-sky-400/10">
                        <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Criminal Record Checks (Safeguarding)</p>
                        <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                          <span className="text-white">What:</span> A national-level check (e.g., ICPC in the UK, FBI in the US).<br/>
                          <span className="text-white">Validity:</span> 3–6 Months. These are "snapshots," so don't request too early.<br/>
                          <span className="text-sky-400/80 uppercase text-[10px] font-black">Teacher Tip:</span> If you have lived in multiple countries, you may need a check from each one for the last 5–10 years.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Visas & Work Permits</p>
                        <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                          <span className="text-white">What:</span> The Entry Visa gets you in; the Work Permit lets you stay and get paid.<br/>
                          <span className="text-white">Validity:</span> Length of Contract (usually 1–2 years).<br/>
                          <span className="text-sky-400 uppercase text-[10px] font-black">Red Flag:</span> Avoid schools that ask you to work on a "Tourist Visa" while they "fix" the permit. It is illegal.
                        </p>
                      </div>
                      <div className="space-y-1 pt-3 border-t border-sky-400/10">
                        <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Embassy Registration & Local ID</p>
                        <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                          <span className="text-white">What:</span> Registering with your home country and getting a local ID (e.g., Emirates ID, ARC).<br/>
                          <span className="text-white">Validity:</span> Linked to your visa.<br/>
                          <span className="text-sky-400/80 uppercase text-[10px] font-black">Teacher Tip:</span> Local IDs are the "key to the city"—you usually cannot get a bank account or home Wi-Fi without one.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="pt-3 border-t border-sky-400/10">
                  <div className="p-5 bg-sky-400/5 border border-sky-400/20 italic">
                    <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                      <span className="text-sky-400 font-black uppercase tracking-widest block mb-1">Expert Tip:</span>
                      "Scan everything. Before you hand over any original document to a school or embassy, ensure you have a high-resolution PDF saved in the cloud. You’ll need these scans for everything from opening a bank account to registering for a local SIM card before your physical ID arrives."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 3B — TRANSPORT STRATEGY */}
      <div className="mb-4 ml-6 md:ml-12 border-l-2 border-sky-400/20 pl-4 md:pl-6">
        <button
          onClick={() => setStep3bOpen(!step3bOpen)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Navigation className="size-5 text-sky-400 -rotate-90" />
            <p className="text-[16px] font-black tracking-[0.2em] text-slate-300">Step 3b. Transport Strategy</p>
          </div>
          {step3bOpen ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step3bOpen && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 relative group hover:border-sky-400/40 transition-all">
              <div className="space-y-6">
                
                <div className="flex bg-black/40 p-0.5 border border-white/10 rounded-sm w-fit">
                  <button onClick={() => setTransportMode('public')} className={cn("px-4 py-1.5 text-[12px] font-black uppercase italic transition-all", transportMode === 'public' ? "bg-sky-400 text-black" : "text-slate-500 hover:text-white")}>Public</button>
                  <button onClick={() => setTransportMode('drive')} className={cn("px-4 py-1.5 text-[12px] font-black uppercase italic transition-all", transportMode === 'drive' ? "bg-sky-400 text-black" : "text-slate-500 hover:text-white")}>Driving</button>
                  <button onClick={() => setTransportMode('taxi')} className={cn("px-4 py-1.5 text-[12px] font-black uppercase italic transition-all", transportMode === 'taxi' ? "bg-sky-400 text-black" : "text-slate-500 hover:text-white")}>Taxi/App</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Navigation className="size-4 text-sky-400 -rotate-90" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Mode Plan</h4>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 leading-relaxed italic">
                        {transportMode === 'public' && "Budget-friendly in hubs like Dubai or HK. Often more reliable than home-country networks. Note: In some regions, low frequency or lack of direct access to school stops can make this impractical."}
                        {transportMode === 'drive' && "Essential for satellite communities. Note: Residency is usually required to buy a car; this is often best handled after your probation period."}
                        {transportMode === 'taxi' && "Good for the first 14 days and grocery runs, but unsustainable as a long-term primary commute."}
                      </p>
                    </div>
                  </div>

                  {/* Right Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <ShieldCheck className="size-4 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">Checklist Items</h4>
                      </div>
                      <ul className="space-y-2 text-[12px] font-bold text-slate-300 italic">
                        {transportMode === 'public' && (
                          <>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> Metro registration (Nol, Octopus, Litacka)</li>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> Map your 'School-to-Station' walking route</li>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> Download official transit apps (e.g. S'hail, Citymapper)</li>
                          </>
                        )}
                        {transportMode === 'drive' && (
                          <>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> IDP (International Driving Permit) - Get before leaving!</li>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> Verify home-license exchange rules (Some need re-tests)</li>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> Budget for 'Salik' (tolls) and mandatory parking fees</li>
                          </>
                        )}
                        {transportMode === 'taxi' && (
                          <>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> Download local apps (Careem, Grab, Uber, Bolt)</li>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> Link a multi-currency card (Wise/Revolut) to save on fees</li>
                            <li className="flex gap-3"><span className="text-sky-400 font-black">●</span> Share live ride location; know the price before you start</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

                </div>

                <div className="pt-3 border-t border-sky-400/10">
                  <div className="p-5 bg-sky-400/5 border border-sky-400/20 italic">
                    <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                      <span className="text-sky-400 font-black uppercase tracking-widest block mb-1">Expert Tip:</span>
                      "Mobilize together. Check if your school has a 'Teacher Carpool' or staff shuttle. It’s the fastest way to cut costs and get the 'staff-room honest' intel on the best neighborhoods and local hidden gems."
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 3C — PENSIONS & RETIREMENT */}
      <div className="mb-4 ml-6 md:ml-12 border-l-2 border-sky-400/20 pl-4 md:pl-6">
        <button
          onClick={() => setStep3cOpen(!step3cOpen)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Landmark className="size-5 text-sky-400" />
            <p className="text-[16px] font-black tracking-[0.2em] text-slate-300">Step 3c. Pensions & Retirement</p>
          </div>
          {step3cOpen ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step3cOpen && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 relative group hover:border-sky-400/40 transition-all">
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card - UK Pension Strategy */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <Landmark className="size-4 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">UK Pension Strategy</h4>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 leading-relaxed italic">
                        As of April 2026, Class 3 NI is the primary mechanism to protect your UK State Pension.
                      </p>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Cost: £18.40 / week</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">Approx £957/year. Each qualifying year adds ~£358 to your annual pension for life.</p>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-sky-400/10">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">ROI: 3-Year Breakeven</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">The strongest return on investment for any teacher abroad. Break even within 3 years of retirement.</p>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-sky-400/10">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Eligibility</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">Must have 10 qualifying years or 10 years of continuous UK residency. You can backfill 6 previous years.</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-2 border-t border-sky-400/10">
                          * Advice only - check with HMRC / DWP for final eligibility.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Card - US Pension Strategy */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 border-b border-sky-400/10 pb-3">
                        <ShieldCheck className="size-4 text-sky-400" />
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-white">US Pension Strategy</h4>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 leading-relaxed italic">
                        US educators face the "Windfall Elimination Provision" (WEP) when teaching on local contracts.
                      </p>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">WEP Risk</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">Foreign pensions (like UAE gratuity) can reduce your US Social Security payout by up to 50%.</p>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-sky-400/10">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">IRA Contribution Trap</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">If using the FEIE (Foreign Earned Income Exclusion), you have no "earned income" to contribute to a Roth IRA.</p>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-sky-400/10">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">Brokerage Strategy</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">Most US teachers abroad use low-cost index funds in a standard brokerage account to mirror 401(k) growth.</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-2 border-t border-sky-400/10">
                          * Advice only - check with SSA / Tax Professional for individual guidance.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Full-Width Footer for Other Nations */}
                <div className="bg-black/40 border border-sky-400/20 p-5 mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <h5 className="text-[13px] font-black text-white uppercase tracking-wider">Other Nations & Custom Calculations</h5>
                    <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                      For other nations, consult with the <Link href="/financial-forecaster" className="text-sky-400 underline hover:text-sky-300">LeopardfishIntel evaluate page</Link> for regional specifics and tailored pension calculations.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 3D — MONEY & BANKING */}
      <div className="mb-4 ml-6 md:ml-12 border-l-2 border-sky-400/20 pl-4 md:pl-6">
        <button
          onClick={() => setStep3dOpen(!step3dOpen)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Landmark className="size-5 text-sky-400" />
            <p className="text-[16px] font-black tracking-[0.2em] text-slate-300">Step 3d. Money & Banking</p>
          </div>
          {step3dOpen ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step3dOpen && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 relative group hover:border-sky-400/40 transition-all">
              <div className="space-y-6">
                
                <p className="text-[14px] font-bold text-slate-300 leading-relaxed">
                  Moving money internationally can cost you 3% to 5% of your salary in hidden bank fees.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-4">
                      {[
                        { title: "School-Preferred Banks", desc: "Ask which bank the school uses for payroll. Using the same provider usually ensures same-day pay and branch convenience." },
                        { title: "Avoid High-Street Rates", desc: "Use apps like Wise or Revolut for the mid-market rate. Banks hide massive fees in poor exchange rates." }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">{item.title}</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-4">
                      {[
                        { title: "The Triple-Dip Trap", desc: "SWIFT transfers get charged by sending, receiving, and intermediary banks. Fintech bypasses this, saving ~£30/transfer." },
                        { title: "The Split Strategy", desc: "Local account for rent/daily life. Sweep savings home monthly to protect against local currency drops." }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">{item.title}</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="pt-3 border-t border-sky-400/10">
                  <div className="p-5 bg-sky-400/5 border border-sky-400/20 italic">
                    <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                      <span className="text-sky-400 font-black uppercase tracking-widest block mb-1">Expert Tip:</span>
                      "Don't transfer on Fridays. Banks add a 'volatility buffer' over weekends. Send your money on a Tuesday or Wednesday for the cheapest results."
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ MISSION PHASE: STEP 3E — HEALTH & REGISTRATION */}
      <div className="mb-4 ml-6 md:ml-12 border-l-2 border-sky-400/20 pl-4 md:pl-6">
        <button
          onClick={() => setStep3eOpen(!step3eOpen)}
          className="w-full text-left p-6 bg-sky-400/5 border border-sky-400/20 hover:border-sky-400/40 relative group transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Stethoscope className="size-5 text-sky-400" />
            <p className="text-[16px] font-black tracking-[0.2em] text-slate-300">Step 3e. Health & Registration</p>
          </div>
          {step3eOpen ? (
            <ChevronUp className="size-5 text-sky-400" />
          ) : (
            <ChevronDown className="size-5 text-sky-400" />
          )}
        </button>

        {step3eOpen && (
          <div className="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-6 bg-sky-400/5 border border-sky-400/20 relative group hover:border-sky-400/40 transition-all">
              <div className="space-y-6">
                
                <p className="text-[14px] font-bold text-slate-300 leading-relaxed">
                  Your medical cover is your most important safety net.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  
                  {/* Left Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-4">
                      {[
                        { title: "The Arrival Gap", desc: "Many policies activate only on your first contract day. If you land 2 weeks early, you are uninsured. Bridge this with travel insurance." },
                        { title: "Network Tier Limits", desc: "Check if your card is Premium or General. General networks often exclude the top-tier hospitals near expat housing." }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">{item.title}</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column Card */}
                  <div className="bg-black/40 border border-sky-400/20 p-5 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-4">
                      {[
                        { title: "Co-Pay Realities", desc: "Basic plans often have 20%+ co-pays for dental or outpatient visits. Budget for out-of-pocket minor illnesses." },
                        { title: "Fitness for Residency", desc: "Expect a mandatory Fitness Test (Blood/X-ray). Certain historical conditions can impact your residency permit." }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[13px] font-black text-sky-400 uppercase tracking-wider">{item.title}</p>
                          <p className="text-[12px] font-bold text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="pt-3 border-t border-sky-400/10">
                  <div className="p-5 bg-sky-400/5 border border-sky-400/20 italic">
                    <p className="text-[12px] font-bold text-slate-400 leading-relaxed">
                      <span className="text-sky-400 font-black uppercase tracking-widest block mb-1">Expert Tip:</span>
                      "Download the insurance app immediately. Having your digital card and policy number ready means you can find 'in-network' clinics in seconds during an emergency."
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
        

      {/* 🚀 PRE-Briefing confirmation overlay modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0b1224] border border-[#d95f02]/30 p-6 max-w-md w-full relative space-y-6 shadow-2xl">
            <button 
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="space-y-2">
              <p className="text-lg font-black text-white italic uppercase tracking-wider flex items-center gap-2">
                <Target className="size-5 text-[#d95f02]" />
                Verify Deployment Profile
              </p>
              <p className="text-[12px] font-bold text-slate-400 leading-relaxed italic">
                Confirm your deployment parameters. These selections directly feed the dynamic briefing calculations and Genkit modules in your PDF Field Manual.
              </p>
            </div>

            <div className="space-y-4">
              {/* Country */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold text-slate-400 italic">1. Target Country</Label>
                <Select value={selectedCountry} onValueChange={(val: string) => { setSelectedCountry(val); setSelectedSchoolId(null); }}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[12px] font-black italic text-white"><SelectValue placeholder="Select country..." /></SelectTrigger>
                  <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                    <SelectItem value="all">Everywhere</SelectItem>
                    {availableCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* School */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold text-slate-400 italic">2. Target School</Label>
                <Select value={selectedSchoolId ?? ''} onValueChange={(val: string) => setSelectedSchoolId(val)}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[12px] font-black italic text-white"><SelectValue placeholder="Pick your school..." /></SelectTrigger>
                  <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                    {filteredSchools.map(s => <SelectItem key={s.id} value={s.id}>{s.schoolname}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Family status */}
              <div className="space-y-1.5">
                <Label className="text-[12px] font-bold text-slate-400 italic">3. Family Status Profile</Label>
                <Select value={calcStatus} onValueChange={(val: string) => setCalcStatus(val)}>
                  <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[12px] font-black italic text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married-dual">Married (dual income)</SelectItem>
                    <SelectItem value="married-sole">Married (sole earner)</SelectItem>
                    <SelectItem value="family-1">Family (1 child)</SelectItem>
                    <SelectItem value="family-2">Family (2 children)</SelectItem>
                    <SelectItem value="family-3">Family (3+ children)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmModalOpen(false)}
                className="w-1/3 border-white/10 hover:bg-white/5 text-white font-bold text-xs uppercase italic rounded-none h-11"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  downloadBriefingPdf();
                }}
                className="w-2/3 bg-[#d95f02] hover:bg-[#d95f02]/90 text-white font-black text-xs uppercase italic rounded-none h-11"
              >
                Confirm & Generate PDF
              </Button>
            </div>
          </div>
        </div>
      )}

        <div className="h-12" />
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
    <div className="bg-black/40 border border-white/5 p-3 space-y-2 hover:border-[#d95f02]/20 transition-all group relative h-full flex flex-col justify-between">
      <div className="flex items-center justify-between gap-1 min-h-[16px]">
        <div className="text-[13px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
          <Icon className="size-3 text-sky-400 shrink-0" /> {label}
          {info && (
            <div className="group/info relative shrink-0">
              <Info className="size-2.5 text-slate-600 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-black border border-white/10 rounded-sm text-[13px] font-bold text-slate-300 leading-tight italic opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                {info}
              </div>
            </div>
          )}
        </div>
        {action}
      </div>
      
      <div className="space-y-1">
        <div className="relative">
          <span className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 font-black italic pointer-events-none transition-colors",
            isLongSymbol ? "text-[13px] tracking-tight" : "text-lg",
            isOverridden ? "text-[#d95f02]" : "text-slate-500"
          )}>
            {currencySymbol}
          </span>
          <Input 
            type="number" 
            value={displayVal || ''} 
            onChange={(e: ChangeEvent<HTMLInputElement>) => onOverride?.(e.target.value ? Number(e.target.value) : null)}
            className={cn(
              "bg-black/60 border-white/5 h-12 text-[16px] font-black italic rounded-none focus-visible:ring-[#d95f02] transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              isLongSymbol ? "pl-14" : "pl-10",
              isOverridden ? "text-[#d95f02] border-[#d95f02]/30" : "text-white"
            )}
          />
        </div>
      </div>
    </div>
  );
}

function IntelCard({ title, icon: Icon, items, subtext }: { title: string, icon: any, items: string[], subtext: string }) {
  return (
    <Card className="bg-[#0b1224] border-white/5 p-5 hover:border-sky-400/30 transition-all group text-white h-full">
      <CardHeader className="p-0 mb-3 space-y-1 text-white">
        <div className="flex items-center gap-3 text-white">
          <Icon className="size-4 text-sky-400 text-white" />
          <CardTitle className="text-[12px] font-black uppercase tracking-widest text-white">{title}</CardTitle>
        </div>
        <p className="text-[12px] text-slate-500 font-bold leading-tight italic text-white opacity-80">{subtext}</p>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="space-y-2.5 pt-1">
          {items.map((item, i) => (
            <li key={i} className="text-[12px] font-bold text-slate-400 flex items-start gap-3 leading-tight italic">
              <span className="text-[#d95f02]">●</span> {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RiskCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-4 bg-[#0b1224] border border-white/5 rounded-sm hover:border-[#d95f02]/40 transition-all group w-full">
      <div className="flex items-center gap-3 mb-1.5 text-white">
        <Icon className="size-4 text-[#d95f02]" />
        <h4 className="text-[13px] font-black text-white italic uppercase tracking-widest">{title}</h4>
      </div>
      <p className="text-[12px] text-slate-400 font-bold leading-tight italic">{desc}</p>
    </div>
  );
}