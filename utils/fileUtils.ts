
import { WordDefinition } from "../types";

export const exportVocabulary = (vocabulary: WordDefinition[]) => {
  if (!vocabulary || vocabulary.length === 0) {
    alert("Geen woordenschat om te exporteren.");
    return;
  }

  const headers = ["Woord (Nederlands)", "Vertaling (Spaans)", "Voorbeeld (Nederlands)"];
  const rows = vocabulary.map(item =>
    [item.word, item.translation, item.example]
    .map(field => `"${String(field || '').replace(/"/g, '""')}"`) // Quote fields and escape double quotes
    .join(',')
  );

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "nederlandse_woordenschat.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};