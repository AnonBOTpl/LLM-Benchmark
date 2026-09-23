//! Pamięć systemowa: ile ten komputer ma RAM i ile jest **wolne**.
//!
//! Bez tego prognoza umiała powiedzieć tylko „nie mieści się na karcie", co przy
//! modelu 43 GB i 16 GB RAM brzmi jak „będzie wolno", a znaczy „nie uruchomi
//! się wcale". To różnica, której użytkownik nie może zgadywać.
//!
//! `navigator.deviceMemory` ze strony przeglądarki nie wystarcza (sprawdzone):
//! zwraca wartość zaokrągloną i nigdy nie mówi, ile jest wolne **teraz**.

use sysinfo::System;

/// Ile RAM zostawiamy systemowi i reszcie programów.
///
/// Prognoza, która liczy „wolny RAM co do megabajta", obiecuje coś, czego nie
/// może dowieźć: system potrzebuje miejsca na własne bufory, a przeglądarka
/// potrafi zjeść 2 GB między jednym odczytem a drugim.
pub const RAM_RESERVE_MB: u64 = 1536;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Ram {
    pub total_mb: u64,
    pub available_mb: u64,
}

impl Ram {
    /// Wolne po odjęciu rezerwy - tyle naprawdę możemy zaangażować.
    pub fn usable_mb(&self) -> u64 {
        self.available_mb.saturating_sub(RAM_RESERVE_MB)
    }
}

fn bytes_to_mb(bytes: u64) -> u64 {
    bytes / 1_048_576
}

/// Migawka z tej chwili. Wolny RAM zmienia się z sekundy na sekundę, więc ta
/// liczba jest prawdziwa tylko dla momentu odczytu - interfejs mówi o tym wprost.
pub fn snapshot() -> Ram {
    let mut system = System::new();
    system.refresh_memory();
    Ram {
        total_mb: bytes_to_mb(system.total_memory()),
        available_mb: bytes_to_mb(system.available_memory()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reserve_is_subtracted_from_available() {
        let ram = Ram {
            total_mb: 16_384,
            available_mb: 8_500,
        };
        assert_eq!(ram.usable_mb(), 8_500 - RAM_RESERVE_MB);
    }

    /// Gdy wolnego RAM jest mniej niż rezerwa, „ile możemy użyć" to zero,
    /// a nie liczba ujemna - inaczej porównania wielkości modelu zwariowałyby.
    #[test]
    fn usable_never_goes_negative() {
        let ram = Ram {
            total_mb: 16_384,
            available_mb: 200,
        };
        assert_eq!(ram.usable_mb(), 0);
    }

    /// Odczyt z prawdziwego systemu musi dać sensowne liczby: ten komputer
    /// ma RAM, a dostępne nie może być większe od całego.
    #[test]
    fn snapshot_reports_plausible_numbers() {
        let ram = snapshot();
        assert!(ram.total_mb > 1_000, "total: {} MB", ram.total_mb);
        assert!(ram.available_mb <= ram.total_mb);
    }
}
