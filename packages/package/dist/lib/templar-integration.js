export class TemplarIntegration {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async integrateHands(hands, options) {
        const result = {
            success: true,
            handsInserted: 0,
            handsFailed: 0,
            errors: [],
        };
        for (const hand of hands) {
            try {
                if (options.validateOnly) {
                    this.validateHand(hand);
                }
                else {
                    await this.integrateHand(hand, options.dayId, options.skipDuplicates);
                    result.handsInserted++;
                }
            }
            catch (error) {
                result.handsFailed++;
                result.errors.push({
                    handId: hand.hand_id,
                    message: error.message || 'Unknown error',
                    error,
                });
                result.success = false;
            }
        }
        return result;
    }
    async integrateHand(hand, dayId, skipDuplicates = false) {
        this.validateHand(hand);
        if (skipDuplicates) {
            const { data: existing } = await this.supabase
                .from('hands')
                .select('id')
                .eq('day_id', dayId)
                .eq('timestamp', hand.timestamp.toString())
                .single();
            if (existing) {
                console.log(`Hand ${hand.hand_id} already exists, skipping`);
                return;
            }
        }
        const playerIdMap = await this.getOrCreatePlayers(hand.players);
        const supabaseHand = this.transformHandToSupabase(hand, dayId);
        const { data: insertedHand, error: handError } = await this.supabase
            .from('hands')
            .insert(supabaseHand)
            .select('id')
            .single();
        if (handError || !insertedHand) {
            throw new Error(`Failed to insert hand: ${handError?.message}`);
        }
        const handId = insertedHand.id;
        const handPlayers = this.transformHandPlayersToSupabase(hand, handId, playerIdMap);
        const { error: playersError } = await this.supabase
            .from('hand_players')
            .insert(handPlayers);
        if (playersError) {
            await this.supabase.from('hands').delete().eq('id', handId);
            throw new Error(`Failed to insert hand_players: ${playersError.message}`);
        }
        const handActions = this.transformHandActionsToSupabase(hand, handId, playerIdMap);
        if (handActions.length > 0) {
            const { error: actionsError } = await this.supabase
                .from('hand_actions')
                .insert(handActions);
            if (actionsError) {
                await this.supabase.from('hand_players').delete().eq('hand_id', handId);
                await this.supabase.from('hands').delete().eq('id', handId);
                throw new Error(`Failed to insert hand_actions: ${actionsError.message}`);
            }
        }
    }
    validateHand(hand) {
        if (!hand.hand_id) {
            throw new Error('Hand ID is required');
        }
        if (!hand.players || hand.players.length === 0) {
            throw new Error('Hand must have at least one player');
        }
        if (!hand.actions || !hand.actions.preflop || hand.actions.preflop.length === 0) {
            throw new Error('Hand must have preflop actions');
        }
        for (const player of hand.players) {
            if (!player.name) {
                throw new Error(`Player ${player.position} has no name`);
            }
            if (!player.position) {
                throw new Error(`Player ${player.name} has no position`);
            }
        }
    }
    async getOrCreatePlayers(players) {
        const playerIdMap = new Map();
        for (const player of players) {
            const { data: existing } = await this.supabase
                .from('players')
                .select('id')
                .eq('name', player.name)
                .single();
            if (existing) {
                playerIdMap.set(player.name, existing.id);
            }
            else {
                const { data: newPlayer, error } = await this.supabase
                    .from('players')
                    .insert({
                    name: player.name,
                    country: null,
                    photo_url: null,
                    total_winnings: 0,
                })
                    .select('id')
                    .single();
                if (error || !newPlayer) {
                    throw new Error(`Failed to create player ${player.name}: ${error?.message}`);
                }
                playerIdMap.set(player.name, newPlayer.id);
            }
        }
        return playerIdMap;
    }
    transformHandToSupabase(hand, dayId) {
        const description = this.generateHandDescription(hand);
        const boardCards = this.extractBoardCards(hand);
        return {
            day_id: dayId,
            number: hand.hand_id,
            description,
            timestamp: hand.timestamp.toString(),
            pot_size: hand.result.pot_final,
            board_cards: boardCards,
            favorite: false,
        };
    }
    generateHandDescription(hand) {
        const descriptions = [];
        for (const player of hand.players) {
            if (player.hole_cards) {
                const cards = player.hole_cards.join('');
                descriptions.push(`${player.name} ${cards}`);
            }
        }
        return descriptions.join(' / ');
    }
    extractBoardCards(hand) {
        const cards = [];
        if (hand.actions.flop) {
            cards.push(...hand.actions.flop.cards);
        }
        if (hand.actions.turn && hand.actions.turn.cards.length > 3) {
            cards.push(hand.actions.turn.cards[3]);
        }
        if (hand.actions.river && hand.actions.river.cards.length > 4) {
            cards.push(hand.actions.river.cards[4]);
        }
        return cards.length > 0 ? cards.join(' ') : undefined;
    }
    transformHandPlayersToSupabase(hand, handId, playerIdMap) {
        return hand.players.map((player) => ({
            hand_id: handId,
            player_id: playerIdMap.get(player.name),
            position: player.position,
            cards: player.hole_cards?.join('') || undefined,
            starting_stack: player.stack_start,
            ending_stack: player.stack_end,
        }));
    }
    transformHandActionsToSupabase(hand, handId, playerIdMap) {
        const actions = [];
        let sequence = 1;
        for (const action of hand.actions.preflop) {
            actions.push({
                hand_id: handId,
                player_id: playerIdMap.get(action.player),
                street: 'preflop',
                action_type: action.action,
                amount: action.amount,
                sequence: sequence++,
            });
        }
        if (hand.actions.flop) {
            for (const action of hand.actions.flop.actions) {
                actions.push({
                    hand_id: handId,
                    player_id: playerIdMap.get(action.player),
                    street: 'flop',
                    action_type: action.action,
                    amount: action.amount,
                    sequence: sequence++,
                });
            }
        }
        if (hand.actions.turn) {
            for (const action of hand.actions.turn.actions) {
                actions.push({
                    hand_id: handId,
                    player_id: playerIdMap.get(action.player),
                    street: 'turn',
                    action_type: action.action,
                    amount: action.amount,
                    sequence: sequence++,
                });
            }
        }
        if (hand.actions.river) {
            for (const action of hand.actions.river.actions) {
                actions.push({
                    hand_id: handId,
                    player_id: playerIdMap.get(action.player),
                    street: 'river',
                    action_type: action.action,
                    amount: action.amount,
                    sequence: sequence++,
                });
            }
        }
        return actions;
    }
}
export default TemplarIntegration;
//# sourceMappingURL=templar-integration.js.map