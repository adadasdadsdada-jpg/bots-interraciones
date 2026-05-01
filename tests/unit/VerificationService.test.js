/**
 * @fileoverview Tests para VerificationService (FSM)
 */

'use strict';

const { VerificationService, VerificationState } = require('../../src/shared/services/VerificationService');

// Mock logger
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock configManager
const mockConfigManager = {
    verificacionAutorizados: ['role1', 'role2', 'role3'],
    jerarquia: [
        { id: 'role1', nombre: 'Admin', puedeAceptar: ['Miembro', 'Test'] },
        { id: 'role2', nombre: 'Mod', puedeAceptar: ['Miembro'] },
        { id: 'role3', nombre: 'User', puedeAceptar: [] }
    ]
};

describe('VerificationService', () => {
    let service;

    beforeEach(() => {
        service = new VerificationService({
            logger: mockLogger,
            configManager: mockConfigManager
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('startVerification', () => {
        test('should start verification process', () => {
            const result = service.startVerification('user123', 'User#1234');

            expect(result.success).toBe(true);
            expect(result.newState).toBe(VerificationState.AWAITING_DATA);
        });

        test('should not restart if already in process', () => {
            service.startVerification('user123', 'User#1234');
            const result = service.startVerification('user123', 'User#1234');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Ya tienes una verificación en proceso');
        });
    });

    describe('submitVerificationData', () => {
        test('should accept valid data', () => {
            service.startVerification('user123', 'User#1234');
            const result = service.submitVerificationData('user123', 'John Doe', 'ID123');

            expect(result.success).toBe(true);
            expect(result.newState).toBe(VerificationState.AWAITING_ROLE);
        });

        test('should fail if no verification in process', () => {
            const result = service.submitVerificationData('user123', 'John Doe', 'ID123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('No hay verificación en proceso');
        });

        test('should fail if wrong state', () => {
            service.startVerification('user123', 'User#1234');
            service.submitVerificationData('user123', 'John', 'ID1');
            // Now it's in AWAITING_ROLE state
            const result = service.submitVerificationData('user123', 'John', 'ID1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Estado inválido para recibir datos');
        });
    });

    describe('submitRango', () => {
        test('should accept rango selection', () => {
            service.startVerification('user123', 'User#1234');
            service.submitVerificationData('user123', 'John', 'ID1');
            const result = service.submitRango('user123', 'rango1', 'Miembro');

            expect(result.success).toBe(true);
            expect(result.newState).toBe(VerificationState.PENDING_REVIEW);
        });

        test('should store rango data', () => {
            service.startVerification('user123', 'User#1234');
            service.submitVerificationData('user123', 'John', 'ID1');
            service.submitRango('user123', 'rango1', 'Miembro');

            const pending = service.getPendingVerification('user123');
            expect(pending.rangoId).toBe('rango1');
            expect(pending.rangoNombre).toBe('Miembro');
        });
    });

    describe('approveVerification', () => {
        test('should approve and register user', () => {
            service.startVerification('user123', 'User#1234');
            service.submitVerificationData('user123', 'John', 'ID1');
            service.submitRango('user123', 'rango1', 'Miembro');

            const result = service.approveVerification('reviewer456', 'user123');

            expect(result.success).toBe(true);
            expect(result.newState).toBe(VerificationState.APPROVED);
        });

        test('should register user in registry', () => {
            service.startVerification('user123', 'User#1234');
            service.submitVerificationData('user123', 'John', 'ID1');
            service.submitRango('user123', 'rango1', 'Miembro');
            service.approveVerification('reviewer456', 'user123');

            const user = service.getRegisteredUser('user123');
            expect(user).not.toBeNull();
            expect(user.nombreIC).toBe('John');
            expect(user.idIC).toBe('ID1');
        });

        test('should fail if not pending review', () => {
            service.startVerification('user123', 'User#1234');
            const result = service.approveVerification('reviewer456', 'user123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Estado inválido para aprobar');
        });
    });

    describe('rejectVerification', () => {
        test('should reject verification', () => {
            service.startVerification('user123', 'User#1234');
            service.submitVerificationData('user123', 'John', 'ID1');
            service.submitRango('user123', 'rango1', 'Miembro');

            const result = service.rejectVerification('reviewer456', 'user123');

            expect(result.success).toBe(true);
            expect(result.newState).toBe(VerificationState.REJECTED);
        });
    });

    describe('custom nicknames', () => {
        test('should set custom nickname preference', () => {
            service.setCustomNickname('user123');
            expect(service.hasCustomNickname('user123')).toBe(true);
        });

        test('should clear custom nickname preference', () => {
            service.setCustomNickname('user123');
            service.clearCustomNickname('user123');
            expect(service.hasCustomNickname('user123')).toBe(false);
        });
    });

    describe('hasVerificationPermission', () => {
        test('should return true for member with authorized role', () => {
            const member = {
                roles: {
                    cache: {
                        some: () => true
                    }
                }
            };

            // Mock the some method to check for authorized roles
            member.roles.cache.some = (callback) => {
                return callback({ id: 'role1' });
            };

            expect(service.hasVerificationPermission(member)).toBe(true);
        });

        test('should return false for null member', () => {
            expect(service.hasVerificationPermission(null)).toBe(false);
        });

        test('should return false for member without authorized roles', () => {
            const member = {
                roles: {
                    cache: {
                        some: () => false
                    }
                }
            };

            expect(service.hasVerificationPermission(member)).toBe(false);
        });
    });

    describe('canApproveRango', () => {
        test('should return true if role can approve rango', () => {
            const reviewerRole = { id: 'role1' }; // Admin can approve Miembro
            expect(service.canApproveRango(reviewerRole, 'Miembro')).toBe(true);
        });

        test('should return false if role cannot approve rango', () => {
            const reviewerRole = { id: 'role3' }; // User cannot approve anything
            expect(service.canApproveRango(reviewerRole, 'Miembro')).toBe(false);
        });

        test('should return false for unknown role', () => {
            const reviewerRole = { id: 'unknown' };
            expect(service.canApproveRango(reviewerRole, 'Miembro')).toBe(false);
        });
    });

    describe('getStats', () => {
        test('should return correct statistics', () => {
            service.startVerification('user1', 'User#1');
            service.submitVerificationData('user1', 'John', 'ID1');
            service.submitRango('user1', 'rango1', 'Miembro');

            service.startVerification('user2', 'User#2');
            service.submitVerificationData('user2', 'Jane', 'ID2');

            const stats = service.getStats();

            expect(stats.pending).toBe(2);
            expect(stats.byState[VerificationState.AWAITING_DATA]).toBe(0);
            expect(stats.byState[VerificationState.AWAITING_ROLE]).toBe(1);
            expect(stats.byState[VerificationState.PENDING_REVIEW]).toBe(1);
        });
    });

    describe('serialize/restore', () => {
        test('should serialize and restore state', () => {
            service.setCustomNickname('user123');

            const data = service.serialize();
            expect(data.customNicknames).toHaveLength(1);

            // Create new service and restore
            const newService = new VerificationService({
                logger: mockLogger,
                configManager: mockConfigManager
            });
            newService.restore(data);

            expect(newService.hasCustomNickname('user123')).toBe(true);
        });
    });
});
