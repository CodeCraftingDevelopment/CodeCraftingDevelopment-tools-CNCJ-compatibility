import { useCallback } from 'react'
import { AppDispatch, AppState, Account } from '../types/accounts'
import { getNextStep, getPreviousStep } from '../config/stepsConfig'
import { findAccountsNeedingNormalization, applyNormalization } from '../utils/accountUtils'
import { processCncjConflicts, autoCorrectCncjConflicts } from '../utils/cncjConflictUtils'

export const useAppNavigation = (
  state: AppState,
  dispatch: AppDispatch,
  processClientAccounts: (normalizedClientAccounts: Account[], cncjAccounts: Account[]) => void,
  mergedClientAccounts: Account[]
) => {
  // Navigation générique vers l'étape suivante
  const handleNavigateNext = useCallback(() => {
    const nextStep = getNextStep(state.currentStep)
    if (nextStep) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: nextStep.id })
    }
  }, [state.currentStep])

  // Navigation générique vers l'étape précédente
  const handleNavigatePrevious = useCallback(() => {
    const previousStep = getPreviousStep(state.currentStep)
    if (previousStep) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: previousStep.id })
    }
  }, [state.currentStep])

  const handleNext = useCallback(() => {
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] })
      return
    }
    handleNavigateNext()
  }, [state.result, handleNavigateNext])

  const handleMergeNext = useCallback(() => {
    // Détecter les comptes nécessitant une normalisation
    const accountsNeedingNormalization = findAccountsNeedingNormalization(state.clientAccounts)
    dispatch({ type: 'SET_ACCOUNTS_NEEDING_NORMALIZATION', payload: accountsNeedingNormalization })
    
    // Naviguer vers l'étape de normalisation
    handleNavigateNext()
  }, [state.clientAccounts, handleNavigateNext])

  const handleNormalizationNext = useCallback(() => {
    if (state.accountsNeedingNormalization.length > 0 && !state.isNormalizationApplied) {
      // Appliquer la normalisation
      const normalizedClientAccounts = applyNormalization(state.clientAccounts, state.accountsNeedingNormalization)
      dispatch({ type: 'SET_CLIENT_ACCOUNTS', payload: normalizedClientAccounts })
      dispatch({ type: 'SET_NORMALIZATION_APPLIED', payload: true })
      
      // Reprocesser les comptes avec les données normalisées
      processClientAccounts(normalizedClientAccounts, state.cncjAccounts)
    }

    handleNavigateNext()
  }, [state.clientAccounts, state.accountsNeedingNormalization, state.isNormalizationApplied, state.cncjAccounts, handleNavigateNext, processClientAccounts])

  const handleDuplicatesNext = useCallback(() => {
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] })
      return
    }

    // Naviguer vers l'étape de révision des corrections
    handleNavigateNext()
  }, [state.result, handleNavigateNext])

  const handleReviewNext = useCallback(() => {
    if (!state.result) {
      dispatch({ type: 'SET_ERRORS', payload: ['Veuillez attendre que les données soient traitées avant de continuer'] })
      return
    }

    // Ne recalculer les conflits CNCJ que si ce n'a pas déjà été fait
    // Cela préserve les modifications manuelles de l'utilisateur lors de la navigation retour-avant
    if (!state.cncjConflictResult) {
      // Étape 1 : Traiter les conflits CNCJ avec les comptes fusionnés
      const cncjConflicts = processCncjConflicts(mergedClientAccounts, state.cncjAccounts)
      dispatch({ type: 'SET_CNCJ_CONFLICT_RESULT', payload: cncjConflicts })

      // Étape 2 : Générer les corrections automatiques
      const corrections = autoCorrectCncjConflicts(cncjConflicts.duplicates, state.cncjAccounts, mergedClientAccounts)
      dispatch({ type: 'SET_CNCJ_CONFLICT_CORRECTIONS', payload: corrections })
    }

    // Naviguer vers step 6
    handleNavigateNext()
  }, [state.result, state.cncjAccounts, mergedClientAccounts, processCncjConflicts, autoCorrectCncjConflicts, state.cncjConflictResult, handleNavigateNext])

  const handleCncjNext = useCallback(() => {
    handleNavigateNext()
  }, [handleNavigateNext])

  return {
    handleNavigateNext,
    handleNavigatePrevious,
    handleNext,
    handleMergeNext,
    handleNormalizationNext,
    handleDuplicatesNext,
    handleReviewNext,
    handleCncjNext
  }
}
