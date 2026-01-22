import { describe, it, expect } from 'vitest';
import {
    detectBranchCurrency,
    convertUsdToCad,
    extractQuoteId,
    detectBookedOpportunitiesHeaders
} from '../utils/bookedOpportunitiesImporter.js';

describe('Booked Opportunities Importer - Currency Conversion', () => {
    
    describe('detectBranchCurrency', () => {
        
        it('should detect US branch from US flag emoji', () => {
            const result = detectBranchCurrency('NASHVILLE 🇺🇸 - Let\'s Get Moving');
            expect(result.isUS).toBe(true);
            expect(result.isCA).toBe(false);
            expect(result.hasBothFlags).toBe(false);
        });
        
        it('should detect Canadian branch from CA flag emoji', () => {
            const result = detectBranchCurrency('HAMILTON 🇨🇦 - Corporate - Let\'s Get Moving');
            expect(result.isUS).toBe(false);
            expect(result.isCA).toBe(true);
            expect(result.hasBothFlags).toBe(false);
        });
        
        it('should detect both flags as ambiguous', () => {
            const result = detectBranchCurrency('BORDER BRANCH 🇺🇸🇨🇦 - Mixed');
            expect(result.isUS).toBe(false);
            expect(result.isCA).toBe(false);
            expect(result.hasBothFlags).toBe(true);
        });
        
        it('should return all false for branch with no flags', () => {
            const result = detectBranchCurrency('UNKNOWN BRANCH - No Flag');
            expect(result.isUS).toBe(false);
            expect(result.isCA).toBe(false);
            expect(result.hasBothFlags).toBe(false);
        });
        
        it('should return all false for null branch name', () => {
            const result = detectBranchCurrency(null);
            expect(result.isUS).toBe(false);
            expect(result.isCA).toBe(false);
            expect(result.hasBothFlags).toBe(false);
        });
        
        it('should return all false for empty string', () => {
            const result = detectBranchCurrency('');
            expect(result.isUS).toBe(false);
            expect(result.isCA).toBe(false);
            expect(result.hasBothFlags).toBe(false);
        });
        
        it('should handle flag at different positions in string', () => {
            expect(detectBranchCurrency('🇺🇸 PHOENIX').isUS).toBe(true);
            expect(detectBranchCurrency('PHOENIX 🇺🇸').isUS).toBe(true);
            expect(detectBranchCurrency('🇨🇦 TORONTO').isCA).toBe(true);
            expect(detectBranchCurrency('TORONTO 🇨🇦').isCA).toBe(true);
        });
    });
    
    describe('convertUsdToCad', () => {
        
        it('should convert USD to CAD using 1.25 rate', () => {
            expect(convertUsdToCad(100)).toBe(125);
            expect(convertUsdToCad(1000)).toBe(1250);
            expect(convertUsdToCad(80)).toBe(100);
        });
        
        it('should round to 2 decimal places (cents)', () => {
            // 99.99 * 1.25 = 124.9875 -> 124.99
            expect(convertUsdToCad(99.99)).toBe(124.99);
            
            // 33.33 * 1.25 = 41.6625 -> 41.66
            expect(convertUsdToCad(33.33)).toBe(41.66);
            
            // 66.67 * 1.25 = 83.3375 -> 83.34
            expect(convertUsdToCad(66.67)).toBe(83.34);
        });
        
        it('should handle exact cent amounts', () => {
            // 100.00 * 1.25 = 125.00
            expect(convertUsdToCad(100.00)).toBe(125.00);
            
            // 0.01 * 1.25 = 0.0125 -> 0.01
            expect(convertUsdToCad(0.01)).toBe(0.01);
        });
        
        it('should return null for null input', () => {
            expect(convertUsdToCad(null)).toBe(null);
        });
        
        it('should return null for undefined input', () => {
            expect(convertUsdToCad(undefined)).toBe(null);
        });
        
        it('should convert zero correctly', () => {
            expect(convertUsdToCad(0)).toBe(0);
        });
        
        it('should handle large amounts', () => {
            // 1,000,000 * 1.25 = 1,250,000
            expect(convertUsdToCad(1000000)).toBe(1250000);
            
            // 999999.99 * 1.25 = 1249999.9875 -> 1249999.99
            expect(convertUsdToCad(999999.99)).toBe(1249999.99);
        });
        
        it('should handle small fractional amounts', () => {
            // 0.04 * 1.25 = 0.05
            expect(convertUsdToCad(0.04)).toBe(0.05);
            
            // 0.08 * 1.25 = 0.10
            expect(convertUsdToCad(0.08)).toBe(0.10);
        });
    });
    
    describe('Integration: Branch Detection + Conversion', () => {
        
        it('should convert US branch invoiced amount', () => {
            const branchName = 'NASHVILLE 🇺🇸 - Let\'s Get Moving';
            const invoicedAmountUSD = 5000;
            
            const branchCurrency = detectBranchCurrency(branchName);
            let finalAmount = invoicedAmountUSD;
            
            if (branchCurrency.isUS) {
                finalAmount = convertUsdToCad(invoicedAmountUSD);
            }
            
            expect(finalAmount).toBe(6250); // 5000 * 1.25
        });
        
        it('should NOT convert Canadian branch invoiced amount', () => {
            const branchName = 'HAMILTON 🇨🇦 - Corporate - Let\'s Get Moving';
            const invoicedAmountCAD = 5000;
            
            const branchCurrency = detectBranchCurrency(branchName);
            let finalAmount = invoicedAmountCAD;
            
            if (branchCurrency.isUS) {
                finalAmount = convertUsdToCad(invoicedAmountCAD);
            }
            
            expect(finalAmount).toBe(5000); // unchanged
        });
        
        it('should NOT convert when both flags present (defaults to CAD)', () => {
            const branchName = 'WEIRD BRANCH 🇺🇸🇨🇦';
            const invoicedAmount = 5000;
            
            const branchCurrency = detectBranchCurrency(branchName);
            let finalAmount = invoicedAmount;
            
            // Should NOT be isUS when both flags are present
            if (branchCurrency.isUS) {
                finalAmount = convertUsdToCad(invoicedAmount);
            }
            
            expect(branchCurrency.hasBothFlags).toBe(true);
            expect(branchCurrency.isUS).toBe(false);
            expect(finalAmount).toBe(5000); // unchanged
        });
        
        it('should NOT convert when branch has no flag (defaults to CAD)', () => {
            const branchName = 'MYSTERY LOCATION';
            const invoicedAmount = 5000;
            
            const branchCurrency = detectBranchCurrency(branchName);
            let finalAmount = invoicedAmount;
            
            if (branchCurrency.isUS) {
                finalAmount = convertUsdToCad(invoicedAmount);
            }
            
            expect(finalAmount).toBe(5000); // unchanged
        });
        
        it('should handle null invoiced amount gracefully', () => {
            const branchName = 'NASHVILLE 🇺🇸';
            const invoicedAmount = null;
            
            const branchCurrency = detectBranchCurrency(branchName);
            let finalAmount = invoicedAmount;
            
            if (branchCurrency.isUS && invoicedAmount !== null) {
                finalAmount = convertUsdToCad(invoicedAmount);
            }
            
            expect(finalAmount).toBe(null); // stays null
        });
    });
});

describe('Booked Opportunities Importer - Existing Functions', () => {
    
    describe('extractQuoteId', () => {
        
        it('should extract numeric quote ID from string', () => {
            expect(extractQuoteId('278752')).toBe(278752);
            expect(extractQuoteId('278752 open_in_new')).toBe(278752);
        });
        
        it('should return null for empty or invalid input', () => {
            expect(extractQuoteId(null)).toBe(null);
            expect(extractQuoteId('')).toBe(null);
            expect(extractQuoteId('abc')).toBe(null);
        });
    });
    
    describe('detectBookedOpportunitiesHeaders', () => {
        
        it('should validate correct headers', () => {
            const headers = ['Quote #', 'Status', 'Service Date', 'Invoiced Amount', 'Other Col'];
            const result = detectBookedOpportunitiesHeaders(headers);
            expect(result.valid).toBe(true);
        });
        
        it('should reject missing required headers', () => {
            const headers = ['Quote #', 'Status'];
            const result = detectBookedOpportunitiesHeaders(headers);
            expect(result.valid).toBe(false);
            expect(result.message).toContain('Missing required headers');
        });
        
        it('should handle null input', () => {
            const result = detectBookedOpportunitiesHeaders(null);
            expect(result.valid).toBe(false);
        });
    });
});
