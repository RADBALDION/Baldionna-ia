// components/aura.jsx
import React, { useState } from 'react';
import { saveTriageData } from '../api'; // Importamos la función desde api.js

const Aura = () => {
  // Estado para manejar todos los campos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    edad: '',
    peso: '',
    enfermedadesPreexistentes: '',
    tipoSangre: 'A+', // Valor por defecto
    contactosEmergencia: '',
    sintomasActuales: '',
    alergias: '',
    recomendaciones: ''
  });

  // Estado para manejar el archivo subido
  const [historialFile, setHistorialFile] = useState(null);

  // Función genérica para manejar los cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Función para manejar el cambio en el input de archivo
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setHistorialFile(e.target.files[0]);
    }
  };

  // Función que se ejecuta al enviar el formulario (botón Guardar)
  const handleSubmit = async (e) => {
    e.preventDefault(); // Previene que la página se recargue
    
    // Leemos el contenido del archivo como Base64 para poder guardarlo en el JSON
    let fileContent = null;
    if (historialFile) {
      const reader = new FileReader();
      // Usamos una promesa para esperar a que el archivo se lea
      fileContent = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(historialFile);
      });
    }

    // Creamos el objeto final de datos a enviar
    const dataToSave = {
      ...formData,
      historialMedico: {
        fileName: historialFile ? historialFile.name : null,
        content: fileContent // Guardamos el archivo en formato Base64
      }
    };

    try {
      const message = await saveTriageData(dataToSave);
      alert(message); // Mostramos un mensaje de éxito
      // Opcional: limpiar el formulario después de guardar
      setFormData({
        nombre: '', edad: '', peso: '', enfermedadesPreexistentes: '',
        tipoSangre: 'A+', contactosEmergencia: '', sintomasActuales: '',
        alergias: '', recomendaciones: ''
      });
      setHistorialFile(null);
      document.getElementById('historial-file-input').value = ''; // Limpiar el input de archivo

    } catch (error) {
      alert(error.message); // Mostramos un mensaje de error
    }
  };
  
  // Función para el botón de analizar (por ahora solo un placeholder)
  const handleAnalyze = () => {
    alert("Función de análisis no implementada aún. Aquí se enviarían los datos a una IA o a un especialista para su revisión.");
  };

  return (
    <div className="aura-container" style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1>Triaje Médico Rápido</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nombre">Nombre Completo</label>
          <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="edad">Edad</label>
          <input type="number" id="edad" name="edad" value={formData.edad} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="peso">Peso (kg)</label>
          <input type="number" id="peso" name="peso" value={formData.peso} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label htmlFor="enfermedadesPreexistentes">Enfermedades Preexistentes</label>
          <textarea id="enfermedadesPreexistentes" name="enfermedadesPreexistentes" value={formData.enfermedadesPreexistentes} onChange={handleChange}></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="tipoSangre">Tipo de Sangre</label>
          <select id="tipoSangre" name="tipoSangre" value={formData.tipoSangre} onChange={handleChange}>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="contactosEmergencia">Contactos de Emergencia</label>
          <textarea id="contactosEmergencia" name="contactosEmergencia" value={formData.contactosEmergencia} onChange={handleChange} placeholder="Nombre: Teléfono"></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="historial-file-input">Historial Médico (Subir archivo)</label>
          <input type="file" id="historial-file-input" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          {historialFile && <p>Archivo seleccionado: {historialFile.name}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="sintomasActuales">Síntomas Actuales</label>
          <textarea id="sintomasActuales" name="sintomasActuales" value={formData.sintomasActuales} onChange={handleChange} required></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="alergias">Alergias</label>
          <textarea id="alergias" name="alergias" value={formData.alergias} onChange={handleChange}></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="recomendaciones">Recomendaciones a tener en cuenta</label>
          <textarea id="recomendaciones" name="recomendaciones" value={formData.recomendaciones} onChange={handleChange}></textarea>
        </div>

        <div className="button-group" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
          <button type="submit" style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>Guardar Datos Cifrados</button>
          <button type="button" onClick={handleAnalyze} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none' }}>Analizar</button>
        </div>
      </form>
    </div>
  );
};

export default Aura;