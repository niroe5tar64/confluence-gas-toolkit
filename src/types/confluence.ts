export interface ConfluencePage {
  id: string;
  title: string;
  type: string;
  space: { key: string };
  body: {
    storage: {
      value: string;
      representation: string;
    };
  };
}
