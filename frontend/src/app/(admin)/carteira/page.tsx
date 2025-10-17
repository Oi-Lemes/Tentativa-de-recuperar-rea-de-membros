"use client";

import { useState } from 'react';

export default function CarteiraPage() {
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState({
    street: '',
    number: '', // Added house number
    neighborhood: '',
    city: '',
    state: ''
  });
  const [recipientName, setRecipientName] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCep = e.target.value;
    setCep(newCep);

    if (newCep.length === 8) {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`https://viacep.com.br/ws/${newCep}/json/`);
        if (!response.ok) {
          throw new Error('CEP não encontrado');
        }
        const data = await response.json();
        if (data.erro) {
          throw new Error('CEP não encontrado');
        }
        setAddress({
          street: data.logradouro,
          number: '', // Reset number on new CEP
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        });
      } catch (err: any) {
        setError(err.message);
        setAddress({ street: '', number: '', neighborhood: '', city: '', state: '' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement PIX popup logic here
    console.log({
      cep,
      address,
      recipientName,
      shippingMethod
    });
    alert('Emissão solicitada com sucesso! (Popup PIX a ser implementado)');
  };

  return (
    <section className="flex flex-col items-center w-full p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white">Emissão de Carteira Nacional CRTH ABRATH</h1>
        <p className="text-gray-300 mt-2">Preencha os dados abaixo para a emissão e envio da sua carteira.</p>
      </div>

      <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-lg shadow-lg">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="recipientName" className="block text-sm font-medium text-gray-300 mb-2">Nome do Destinatário</label>
              <input
                type="text"
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                required
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-gray-300 mb-2">CEP</label>
              <input
                type="text"
                id="cep"
                value={cep}
                onChange={handleCepChange}
                maxLength={8}
                required
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500"
              />
              {loading && <p className="text-sm text-blue-400 mt-1">Buscando CEP...</p>}
              {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
            </div>

            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-300 mb-2">Rua</label>
              <input type="text" id="street" value={address.street} readOnly className="w-full p-3 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed" />
            </div>

            <div>
              <label htmlFor="number" className="block text-sm font-medium text-gray-300 mb-2">Número / Apto</label>
              <input 
                type="text" 
                id="number" 
                value={address.number} 
                onChange={(e) => setAddress({...address, number: e.target.value})}
                required
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-300 mb-2">Bairro</label>
              <input type="text" id="neighborhood" value={address.neighborhood} readOnly className="w-full p-3 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed" />
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">Cidade</label>
              <input type="text" id="city" value={address.city} readOnly className="w-full p-3 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed" />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
              <input type="text" id="state" value={address.state} readOnly className="w-full p-3 bg-gray-600 border border-gray-500 rounded-md text-gray-400 cursor-not-allowed" />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-white mb-4">Opções de Entrega</h3>
            <div className="space-y-4">
              <label className="flex items-center p-4 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600">
                <input
                  type="radio"
                  name="shipping"
                  value="pac"
                  checked={shippingMethod === 'pac'}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="form-radio h-5 w-5 text-blue-600"
                />
                <div className="ml-4 flex justify-between w-full">
                  <div>
                    <span className="block font-bold text-white">PAC</span>
                    <span className="block text-sm text-gray-400">Entrega em 11 a 14 dias úteis</span>
                  </div>
                  <span className="font-bold text-white">R$ 9,90</span>
                </div>
              </label>
              <label className="flex items-center p-4 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600">
                <input
                  type="radio"
                  name="shipping"
                  value="express"
                  checked={shippingMethod === 'express'}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="form-radio h-5 w-5 text-blue-600"
                />
                <div className="ml-4 flex justify-between w-full">
                  <div>
                    <span className="block font-bold text-white">Express</span>
                    <span className="block text-sm text-gray-400">Entrega em 4 a 8 dias úteis</span>
                  </div>
                  <span className="font-bold text-white">R$ 14,90</span>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors"
            >
              Solicitar Emissão
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}