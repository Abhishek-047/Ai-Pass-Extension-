/**
 * VaultGuard Local AI Engine
 *
 * ALL AI logic runs locally — NO passwords or secrets sent to any API.
 * AI only receives: context labels, domain names, metadata.
 *
 * Features:
 * - Smart password generation (context-aware)
 * - Password strength explanation
 * - Phishing/suspicious domain detection
 * - Vault health recommendations
 * - Security tips
 */
import type { GeneratedPassword, PasswordGeneratorConfig, DomainRiskResult, PasswordAnalysis } from '@/types';
export declare function generatePassword(config: PasswordGeneratorConfig): GeneratedPassword;
export declare function explainPasswordStrength(analysis: PasswordAnalysis): string;
export declare function analyzeDomain(domain: string): DomainRiskResult;
export interface ChatContext {
    vaultItemCount: number;
    weakPasswordCount: number;
    reusedPasswordCount: number;
    securityScore: number;
}
export declare function processAIMessage(userMessage: string, context?: ChatContext): {
    response: string;
    generatedPassword?: GeneratedPassword;
};
