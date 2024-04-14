import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionRow = ({ onPromptClick }) => {
  const prompts = [
    'Dime todas las marcas que existen',
    '¿Cual es la marca y el modelo con precio mas alto?',
    'Dime todas las versiones junto a su precio de la marca "Audi" modelo "Q3"',
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
