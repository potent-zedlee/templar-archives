import type { Hand } from './types/hand.js';
import type { SupabaseClient } from '@supabase/supabase-js';
export interface IntegrationOptions {
    dayId: string;
    skipDuplicates?: boolean;
    validateOnly?: boolean;
}
export interface IntegrationResult {
    success: boolean;
    handsInserted: number;
    handsFailed: number;
    errors: IntegrationError[];
}
export interface IntegrationError {
    handId: string;
    message: string;
    error?: any;
}
export declare class TemplarIntegration {
    private supabase;
    constructor(supabase: SupabaseClient);
    integrateHands(hands: Hand[], options: IntegrationOptions): Promise<IntegrationResult>;
    private integrateHand;
    private validateHand;
    private getOrCreatePlayers;
    private transformHandToSupabase;
    private generateHandDescription;
    private extractBoardCards;
    private transformHandPlayersToSupabase;
    private transformHandActionsToSupabase;
}
export default TemplarIntegration;
//# sourceMappingURL=templar-integration.d.ts.map