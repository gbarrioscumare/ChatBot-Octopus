import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionRow = ({ onPromptClick }) => {
  const prompts = [
    '¿Estas conectado a una base de datos?',
    'Dime todas las versiones de la marca Toyota',
    '¿Cual es la marca y el modelo con precio mas alto?',
    '¿Que marca y modelo tiene mas versiones?, nombrame las versiones disponibles',
  ];

  return (
    <div className="flex flex-row flex-wrap justify-start items-center py-4 gap-2">
      {prompts.map((prompt, index) => (
        <PromptSuggestionButton key={`suggestion-${index}`} text={prompt} onClick={() => onPromptClick(prompt)} />
      ))}
    </div>
  );
};

export default PromptSuggestionRow;
