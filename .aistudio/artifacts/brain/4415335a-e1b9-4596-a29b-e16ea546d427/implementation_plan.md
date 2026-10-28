# Pasek Wyszukiwania na Ekranie Głównym & Rozszerzona Baza Ponad 2000 Leków (URPL / NFZ)

Plan wdrożenia szybkiego paska wyszukiwania w harmonogramie dnia oraz lokalnej, działającej w 100% offline bazy ponad 2000 leków i substancji czynnych z autouzupełnianiem postaci i dawki w aplikacji MedPlaner.

## Potwierdzone Decyzje Użytkownika

> [!IMPORTANT]
> - **Zakres bazy leków**: Rozszerzona baza ponad 2000 leków i substancji czynnych oparta na polskich rejestrach URPL / NFZ z mechanizmem dodawania własnych preparatów (*koło ratunkowe*).
> - **Autouzupełnianie**: Po wybraniu leku z listy system automatycznie sugeruje i uzupełnia formę leku (np. kapsułka, krople, wziew, syrop/ml) oraz standardową dawkę i zalecenia przyjmowania (np. *po posiłku*, *na czczo*).
> - **Pasek wyszukiwania na ekranie „Dziś”**: Umieszczony bezpośrednio pod kartą postępu dnia i filtrami, tuż nad podziałem na pory dnia (Rano, Popołudnie, Wieczór).
> - **Zgodność z budowaniem APK**: Bezwzględne zachowanie wszystkich dotychczasowych poprawek (Android SDK 36, Java 17, `jvmTarget = 17`, brak `shade950`, `.github/workflows/build.yml`).

---

## 1. Przegląd i Doświadczenie Użytkownika (UX)

### A. Pasek wyszukiwania w Harmonogramie Dnia („Dziś”)
- Pole wyszukiwania z ikoną lupy, placeholderem *„Szukaj leku lub terapii...”* oraz przyciskiem czyszczenia *(X)*.
- Filtrowanie w czasie rzeczywistym (as-you-type) według:
  1. Nazwy handlowej leku (np. *Amotaks*, *Ketonal*, *Euthyrox*)
  2. Nazwy terapii (np. *Antybiotyk*, *Krople do oczu*)
  3. Zaleceń lub dawki
- Wizualny licznik pasujących pozycji oraz stan pusty (*„Brak dawek pasujących do wyszukiwania”*) z opcją zresetowania filtra jednym kliknięciem.
- Pełna integracja z sekcjami pór dnia (*Rano*, *Popołudnie*, *Wieczór*).

### B. Baza Leków i Wyszukiwarka z Podpowiedziami (Autocomplete)
- Podczas dodawania leku do terapii (`AddMedicationModal` w symulatorze oraz `AddMedicationScreen` we Flutterze) pole *Nazwa Leku* staje się inteligentnym polem wyszukiwania z podpowiedziami.
- Po wpisaniu pierwszych 2–3 liter (np. *„Amo...”*, *„Ibu...”*, *„Polp...”*) pojawia się lista podpowiedzi zawierająca:
  - Oficjalną nazwę handlową i moc (np. *Amotaks 1g*, *Ibuprom Max 400 mg*)
  - Międzynarodową nazwę substancji czynnej (np. *Amoxicillinum*, *Ibuprofenum*)
  - Znacznik postaci (tabl., krople, syrop, aerozol)
- Kliknięcie leku natychmiast:
  1. Wpisuje pełną nazwę leku
  2. Ustawia właściwy typ (np. *Kapsułka / Tabletka*, *Krople*, *ml*, *Wziew*)
  3. Uzupełnia standardową porcję dawki (np. *1*, *2*, *5*)
  4. Wstawia typowe zalecenie medyczne (np. *„Po posiłku, popić szklanką wody”*, *„Na czczo, 30 min przed posiłkiem”*)
- **Koło ratunkowe (Własny lek)**:
  - Jeśli użytkownik wpisze nazwę preparatu, którego nie ma w bazie, na dole podpowiedzi pojawia się przycisk:  
    `➕ Użyj "[Wpisana nazwa]" jako własnego leku`
  - Pozwala to dodać dowolny suplement, lek z importu docelowego lub recepturowy bez żadnych blokad.

---

## 2. Architektura Systemu i Baza Danych

```
┌──────────────────────────────────────────────────────────────┐
│                    EKRAN GŁÓWNY (DZIŚ)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Karta Postępu Dnia (np. 4/7 dawek, 57% realizacji)     │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ [🔍 Szukaj leku lub terapii...]                    [X] │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌───────────────────┐ ┌───────────────────┐ ┌────────────┐  │
│  │ Wszystkie (7)     │ │ Oczekujące (3)    │ │ Wzięte (4) │  │
│  └───────────────────┘ └───────────────────┘ └────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ☀️ RANO (do 12:00)           [Filtrowane wyniki]       │  │
│  │ 🌤️ POPOŁUDNIE (12:00-18:00)  [Filtrowane wyniki]       │  │
│  │ 🌙 WIECZÓR I NOC (od 18:00)  [Filtrowane wyniki]       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────┘
                               │
               Otwarcie formularza dodawania leku
                               ▼
┌──────────────────────────────────────────────────────────────┐
│            FORMULARZ DODAWANIA LEKU (AUTOCOMPLETE)           │
│  Pole "Nazwa Leku": [ Amo                  ]                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • Amotaks 1g (Amoxicillinum)     -> Tabl. 1g, po jedz. │  │
│  │ • Amotaks Dispertab 750mg        -> Tabl. rozp., woda  │  │
│  │ • Amoksiklav 875mg + 125mg       -> Tabl., na pocz. p. │  │
│  │ ➕ Dodaj "Amo..." jako własny niestandardowy lek       │  │
│  └────────────────────────────────────────────────────────┘  │
│  Automatycznie wypełnione:                                   │
│  Typ: [Kapsułka / Tabletka] | Dawka: [ 1 ] | Zaleceń: [ ... ]│
└──────────────────────────────┬───────────────────────────────┘
                               │
            Zapis do SQLite (Flutter) i React State
                               ▼
┌──────────────────────────────────────────────────────────────┐
│             LOKALNA BAZA LEKÓW (100% OFFLINE)                │
│  - Ponad 2000 leków z rejestru URPL / NFZ                    │
│  - Tabela / lista `custom_medications` (leki własne usera)   │
│  - Tabela `therapies`, `medications`, `dose_logs`            │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Szczegóły Wdrożenia

### Krok 1: Utworzenie Bazy Leków URPL / NFZ (`src/data/polishMedicationsRegistry.ts`)
- Struktura danych `RegisteredMedicine`:
  - `id`: unikalny identyfikator
  - `name`: nazwa handlowa i moc
  - `substance`: substancja czynna (np. *Ibuprofenum*, *Amoxicillinum*, *Metforminum*)
  - `category`: kategoria terapeutyczna (np. *Antybiotyki*, *Kardiologia*, *Przeciwbólowe*, *Okulistyka*, *Układ oddechowy*, *Cukrzyca*)
  - `defaultType`: domyślna postać (`capsule`, `drops`, `ml`, `inhaler`, `application`)
  - `defaultDose`: sugerowana ilość dawki (np. *1*, *2*, *5*)
  - `instructions`: standardowe wskazówki przyjmowania
- Zbudowanie zbalansowanej, bogatej bazy ponad 2000 pozycji obejmującej wszystkie popularne leki na receptę, OTC, syropy, krople, maści i wziewy.

### Krok 2: Pasek Wyszukiwania w `PhoneSimulator.tsx`
- Dodanie stanu `searchQuery` do widoku symulatora.
- Osadzenie paska wyszukiwania bezpośrednio pod kartą postępu dnia i filtrami statusu.
- Filtrowanie wielokryterialne uwzględniające polskie znaki diakrytyczne (case-insensitive i accent-insensitive).
- Przekazywanie przefiltrowanych dawek do sekcji *Rano*, *Popołudnie* i *Wieczór*.

### Krok 3: Autocomplete w formularzu dodawania leku (`AddMedicationModal.tsx`)
- Zastąpienie standardowego pola tekstowego interaktywnym komponentem wyszukiwania z podpowiedziami.
- Wybór leku z listy automatycznie uzupełnia formę, jednostkę, dawkę oraz zalecenia lekarza.
- Możliwość wpisania dowolnego własnego preparatu z przyciskiem szybkiego dodania do listy.

### Krok 4: Wdrożenie w Kodzie Mobilnym Flutter & Project IDX
- Aktualizacja `lib/screens/home_screen.dart` o pasek wyszukiwania `TextField` z ikoną lupy nad podziałem na pory dnia.
- Aktualizacja `lib/screens/add_medication_screen.dart` z widgetem `Autocomplete<RegisteredMedicine>` lub dedykowanym `SearchField` wyszukującym w bazie leków.
- Dodanie serwisu bazy leków `lib/services/medication_registry_service.dart`.
- Zaktualizowanie `src/data/flutterFiles.ts` i katalogu plików projektu, zachowując nienaruszone:
  - Android SDK 36
  - JVM 17
  - `build.yml`
  - Poprawki kolorów i bazy danych

---

## 4. Weryfikacja i Testy

1. **Testy jednostkowe**:
   - Weryfikacja wyszukiwarki leków (odporność na wielkość liter, polskie znaki, wyszukiwanie po nazwie handlowej oraz po substancji czynnej).
   - Weryfikacja poprawnego przypisywania sugerowanych postaci i dawek.
2. **Testy UI w przeglądarce**:
   - Wpisanie frazy w pasku wyszukiwania na ekranie głównym i sprawdzenie dynamicznego filtrowania dawek.
   - Otwarcie formularza dodawania leku, wybranie leku z bazy i sprawdzenie autouzupełnienia pól.
   - Wpisanie niestandardowej nazwy i sprawdzenie „koła ratunkowego”.
3. **Weryfikacja kompilacji**:
   - Sprawdzenie `compile_applet` i `lint_applet` – gwarancja braku błędów i gotowość do budowania APK.
