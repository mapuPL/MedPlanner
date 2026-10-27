import JSZip from 'jszip';
import { FLUTTER_PROJECT_FILES } from '../data/flutterFiles';

export async function downloadFlutterProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Dodaj wszystkie pliki projektu do archiwum zip
  for (const file of FLUTTER_PROJECT_FILES) {
    zip.file(file.path, file.content);
  }

  // Wygeneruj plik zip jako blob
  const content = await zip.generateAsync({ type: 'blob' });

  // Pobierz w przeglądarce
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medplaner-flutter-project-idx.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
