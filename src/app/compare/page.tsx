"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { schools } from '@/lib/mock-data';
import type { School } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

type ComparisonMetric = 'salary' | 'savings' | 'rating' | 'classSize' | 'monthlyCost';

const calculateMonthlyCost = (school: School): number => {
    const { costOfLiving, intel } = school;
    // Calculation for a single adult
    const adults = 1;
    const children = 0;

    const foodCost = costOfLiving.food * adults + costOfLiving.food * 0.5 * children;
    const transportCost = costOfLiving.transport * adults + costOfLiving.transport * 0.3 * children;
    const mobileCost = costOfLiving.mobile * adults;
    const diningSocialCost = costOfLiving.diningSocial * adults;
    const uncoveredMedicalCost = costOfLiving.uncoveredMedical * adults + costOfLiving.uncoveredMedical * 0.5 * children;
    const apartmentCost = intel.housing.provided ? 0 : costOfLiving.apartment;

    return (
      apartmentCost +
      foodCost +
      transportCost +
      costOfLiving.utilities +
      costOfLiving.internet +
      mobileCost +
      diningSocialCost +
      costOfLiving.vehicleInsuranceMaint +
      uncoveredMedicalCost
    );
};

const getNumericValue = (school: School, metric: ComparisonMetric) => {
    switch (metric) {
        case 'salary':
            return parseInt(school.intel.salary.value.split(' - ')[1].replace('k', '000').replace('$', '')) || 0;
        case 'savings':
            if (school.intel.savingsPotential.value === 'Very High') return 3;
            if (school.intel.savingsPotential.value === 'High') return 2;
            if (school.intel.savingsPotential.value === 'Moderate') return 1;
            return 0;
        case 'rating':
            return school.rating;
        case 'classSize':
            return school.intel.classSize;
        case 'monthlyCost':
            return calculateMonthlyCost(school);
        default:
            return 0;
    }
};

const compareSchools = (schoolsToCompare: School[], metric: ComparisonMetric, higherIsBetter: boolean) => {
    if (schoolsToCompare.length < 2) return {};

    const values = schoolsToCompare.map(school => getNumericValue(school, metric));
    const bestValue = higherIsBetter ? Math.max(...values) : Math.min(...values.filter(v => v > 0));
    const worstValue = higherIsBetter ? Math.min(...values) : Math.max(...values);
    
    const results: { [schoolId: string]: 'best' | 'worst' | 'neutral' } = {};
    schoolsToCompare.forEach((school, index) => {
        if (values[index] === bestValue) {
            results[school.id] = 'best';
        } else if (values[index] === worstValue) {
            results[school.id] = 'worst';
        } else {
            results[school.id] = 'neutral';
        }
    });

    if(bestValue === worstValue) {
      schoolsToCompare.forEach(school => results[school.id] = 'neutral');
    }

    return results;
};


export default function ComparePage() {
    const [selectedSchools, setSelectedSchools] = useState<School[]>([schools[0], schools[1], schools[2]].filter(Boolean));

    const handleSelectSchool = (index: number, schoolId: string) => {
        const school = schools.find(s => s.id === schoolId);
        if (school) {
            const newSelection = [...selectedSchools];
            newSelection[index] = school;
            setSelectedSchools(newSelection);
        }
    };
    
    const removeSchool = (index: number) => {
        const newSelection = [...selectedSchools];
        newSelection.splice(index, 1);
        setSelectedSchools(newSelection);
    }
    
    const addSchool = () => {
       const availableSchool = schools.find(s => !selectedSchools.some(ss => ss.id === s.id));
       if(availableSchool) {
           setSelectedSchools([...selectedSchools, availableSchool]);
       }
    }

    const comparisonResults: { [metric: string]: { [schoolId: string]: 'best' | 'worst' | 'neutral' } } = {
        salary: compareSchools(selectedSchools, 'salary', true),
        savings: compareSchools(selectedSchools, 'savings', true),
        rating: compareSchools(selectedSchools, 'rating', true),
        classSize: compareSchools(selectedSchools, 'classSize', false),
        monthlyCost: compareSchools(selectedSchools, 'monthlyCost', false),
    };
    
    const cellClass = (schoolId: string, metric: ComparisonMetric) => {
        const result = comparisonResults[metric]?.[schoolId];
        return cn({
            'bg-emerald-900/20 text-green-400': result === 'best',
            'bg-red-900/20 text-red-400': result === 'worst',
        });
    };

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Compare Schools</h1>
            <p className="text-muted-foreground mb-8">Select up to 3 schools to compare side-by-side.</p>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[200px] min-w-[150px] align-middle">School</TableHead>
                                {selectedSchools.map((school, index) => (
                                    <TableHead key={school.id} className="min-w-[300px]">
                                        <div className="flex justify-between items-center">
                                            <Select value={school.id} onValueChange={(value) => handleSelectSchool(index, value)}>
                                                <SelectTrigger className="w-full border-0 shadow-none bg-transparent hover:bg-muted focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="Select a school" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {schools.map(s => (
                                                        <SelectItem key={s.id} value={s.id} disabled={selectedSchools.some(ss => ss.id === s.id && s.id !== school.id)}>
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 flex-shrink-0" onClick={() => removeSchool(index)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableHead>
                                ))}
                                {selectedSchools.length < 3 && (
                                    <TableHead>
                                        <Button variant="outline" onClick={addSchool} className="w-full">Add School</Button>
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow><TableCell colSpan={selectedSchools.length + 1} className="font-semibold text-primary-foreground bg-muted/30">Ratings & Reviews</TableCell></TableRow>
                            <TableRow>
                                <TableHead>Overall Rating</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id} className={cellClass(s.id, 'rating')}>{s.rating.toFixed(1)} / 5</TableCell>)}
                            </TableRow>
                            <TableRow>
                                <TableHead>Review Count</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id}>{s.reviewsCount}</TableCell>)}
                            </TableRow>

                            <TableRow><TableCell colSpan={selectedSchools.length + 1} className="font-semibold text-primary-foreground bg-muted/30">Financial</TableCell></TableRow>
                            <TableRow>
                                <TableHead>Salary Range</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id} className={cellClass(s.id, 'salary')}>{s.intel.salary.value}</TableCell>)}
                            </TableRow>
                            <TableRow>
                                <TableHead>Savings Potential</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id} className={cellClass(s.id, 'savings')}>{s.intel.savingsPotential.value}</TableCell>)}
                            </TableRow>
                            <TableRow>
                                <TableHead>Est. Monthly Costs (Single)</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id} className={cellClass(s.id, 'monthlyCost')}>{formatCurrency(calculateMonthlyCost(s), 'USD')}</TableCell>)}
                            </TableRow>
                            <TableRow>
                                <TableHead>Housing</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id}>{s.intel.housing.value}</TableCell>)}
                            </TableRow>

                             <TableRow><TableCell colSpan={selectedSchools.length + 1} className="font-semibold text-primary-foreground bg-muted/30">Academics</TableCell></TableRow>
                            <TableRow>
                                <TableHead>Curriculum</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id}>{s.intel.curriculum}</TableCell>)}
                            </TableRow>
                            <TableRow>
                                <TableHead>Average Class Size</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id} className={cellClass(s.id, 'classSize')}>{s.intel.classSize}</TableCell>)}
                            </TableRow>
                            <TableRow>
                                <TableHead>Student-Teacher Ratio</TableHead>
                                {selectedSchools.map(s => <TableCell key={s.id}>{s.intel.studentTeacherRatio}</TableCell>)}
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
