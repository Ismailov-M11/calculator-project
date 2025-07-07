import { useState } from "react";
import {
  City,
  TariffType,
  TariffCalculatorForm,
  TariffCalculationResponse,
} from "@shared/api";
import { useWarehouseCheck } from "./useWarehouseCheck";
import { useI18n } from "./useI18n";

export function useTariffCalculator() {
  const { t } = useI18n();
  const [form, setForm] = useState<TariffCalculatorForm>({
    originCity: null,
    destinationCity: null,
    tariffType: null,
    weight: "",
  });

  const [result, setResult] = useState<TariffCalculationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Warehouse checking
  const { shouldShowWarehouseWarning, shouldDisableCalculation } =
    useWarehouseCheck();

  const updateForm = (updates: Partial<TariffCalculatorForm>) => {
    // If trying to set tariff type without cities selected, show error
    if (updates.tariffType && (!form.originCity || !form.destinationCity)) {
      setError(t.selectCitiesFirst);
      return;
    }

    setForm((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  const resetForm = () => {
    setForm({
      originCity: null,
      destinationCity: null,
      tariffType: null,
      weight: "",
    });
    setResult(null);
    setError(null);
  };

  const calculateTariff = async () => {
    if (
      !form.originCity ||
      !form.destinationCity ||
      !form.tariffType ||
      !form.weight
    ) {
      setError(t.fillAllFields);
      return;
    }

    const weight = parseFloat(form.weight);
    if (isNaN(weight) || weight <= 0) {
      setError(t.correctWeight);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/calculate-tariff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from_latitude: form.originCity.center_latitude,
          from_longitude: form.originCity.center_longitude,
          to_latitude: form.destinationCity.center_latitude,
          to_longitude: form.destinationCity.center_longitude,
          courier_type: form.tariffType,
          weight: weight,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка расчета: ${response.status}`);
      }

      const data: TariffCalculationResponse = await response.json();
      console.log("Tariff calculation response:", data);
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Произошла ошибка при расчете тарифа",
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    form.originCity &&
    form.destinationCity &&
    form.tariffType &&
    form.weight.trim() !== "";

  // Check if calculation should be disabled due to warehouse requirements
  const isCalculationDisabled = shouldDisableCalculation(
    form.originCity,
    form.destinationCity,
    form.tariffType,
  );

  // Get warehouse warning
  const warehouseWarning = shouldShowWarehouseWarning(
    form.originCity,
    form.destinationCity,
    form.tariffType,
  );

  return {
    form,
    result,
    loading,
    error,
    updateForm,
    resetForm,
    calculateTariff,
    isFormValid,
    isCalculationDisabled,
    warehouseWarning,
  };
}
