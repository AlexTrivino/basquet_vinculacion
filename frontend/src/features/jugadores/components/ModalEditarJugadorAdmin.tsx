import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  FileText,
  ShieldAlert,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  Camera,
  Activity,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Jugador } from '../../../types/api.types';
import {
  updateJugador,
  uploadFotoJugador,
  uploadCedulaJugador,
  uploadActaJugador,
} from '../api/jugadores.api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jugador: Jugador | null;
  onJugadorUpdated: (jugadorActualizado: Jugador) => void;
}

type TabType = 'datos' | 'documentos' | 'estado';

export function ModalEditarJugadorAdmin({
  isOpen,
  onClose,
  jugador,
  onJugadorUpdated,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('datos');
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [genero, setGenero] = useState<'masculino' | 'femenino'>('masculino');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [estado, setEstado] = useState<'activo' | 'inactivo'>('activo');

  // File uploading states
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingCedula, setUploadingCedula] = useState(false);
  const [uploadingActa, setUploadingActa] = useState(false);

  // File input refs
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const cedulaInputRef = useRef<HTMLInputElement>(null);
  const actaInputRef = useRef<HTMLInputElement>(null);

  // Local state for URLs to update visually immediately
  const [currentJugador, setCurrentJugador] = useState<Jugador | null>(null);

  useEffect(() => {
    if (jugador && isOpen) {
      setCurrentJugador(jugador);
      setNombre(jugador.nombre || '');
      setDocumento(jugador.documento_identificacion || '');
      setFechaNacimiento(jugador.fecha_nacimiento || '');
      setGenero((jugador.genero as 'masculino' | 'femenino') || 'masculino');
      setTelefono(jugador.telefono || '');
      setCorreo(jugador.correo || '');
      setEstado((jugador.estado as 'activo' | 'inactivo') || 'activo');
      setActiveTab('datos');
    }
  }, [jugador, isOpen]);

  if (!isOpen || !currentJugador) return null;

  // Calcular edad
  const calcularEdad = (fechaStr: string) => {
    if (!fechaStr) return null;
    const dob = new Date(fechaStr);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const edad = calcularEdad(fechaNacimiento);

  const handleSubmitDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre del jugador es requerido.');
      return;
    }
    if (!documento.trim() || documento.trim().length !== 10) {
      toast.error('La cédula debe contener exactamente 10 dígitos numéricos.');
      return;
    }
    if (!fechaNacimiento) {
      toast.error('La fecha de nacimiento es requerida.');
      return;
    }
    if (telefono.trim() && telefono.trim().length !== 10) {
      toast.error('El teléfono debe tener 10 dígitos numéricos.');
      return;
    }

    try {
      setIsSaving(true);
      const idJugador = currentJugador.id_jugador || currentJugador.id;
      if (!idJugador) return;

      const payload = {
        nombre: nombre.trim(),
        documento_identificacion: documento.trim(),
        fecha_nacimiento: fechaNacimiento,
        genero,
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
        estado,
      };

      const res = await updateJugador(idJugador, payload);
      if (res.data) {
        toast.success('Información del jugador actualizada exitosamente.');
        setCurrentJugador(res.data);
        onJugadorUpdated(res.data);
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al actualizar el jugador.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload handlers
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('La foto no debe superar los 4 MB.');
      return;
    }
    try {
      setUploadingFoto(true);
      const idJugador = currentJugador.id_jugador || currentJugador.id;
      if (!idJugador) return;
      const res = await uploadFotoJugador(idJugador, file);
      if (res.data) {
        toast.success('Foto de perfil actualizada.');
        setCurrentJugador(res.data);
        onJugadorUpdated(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al subir la fotografía.');
    } finally {
      setUploadingFoto(false);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
    }
  };

  const handleUploadCedula = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('El documento no debe superar los 4 MB.');
      return;
    }
    try {
      setUploadingCedula(true);
      const idJugador = currentJugador.id_jugador || currentJugador.id;
      if (!idJugador) return;
      const res = await uploadCedulaJugador(idJugador, file);
      if (res.data) {
        toast.success('Documento de cédula actualizado.');
        setCurrentJugador(res.data);
        onJugadorUpdated(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al subir la cédula.');
    } finally {
      setUploadingCedula(false);
      if (cedulaInputRef.current) cedulaInputRef.current.value = '';
    }
  };

  const handleUploadActa = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('El documento no debe superar los 4 MB.');
      return;
    }
    try {
      setUploadingActa(true);
      const idJugador = currentJugador.id_jugador || currentJugador.id;
      if (!idJugador) return;
      const res = await uploadActaJugador(idJugador, file);
      if (res.data) {
        toast.success('Acta de bachiller actualizada.');
        setCurrentJugador(res.data);
        onJugadorUpdated(res.data);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al subir el acta.');
    } finally {
      setUploadingActa(false);
      if (actaInputRef.current) actaInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold border border-orange-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Editar Jugador</h2>
              <p className="text-xs text-slate-400">
                ID #{currentJugador.id_jugador || currentJugador.id} • {currentJugador.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('datos')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'datos'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            Datos Personales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documentos')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'documentos'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentos y Foto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('estado')}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'estado'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            Estado y Equipos
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'datos' && (
            <form id="form-jugador" onSubmit={handleSubmitDatos} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Ej. Juan Carlos Pérez Rodríguez"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Cédula / Documento (10 dígitos) *
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={10}
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value.replace(/[^0-9]/g, ''))}
                      required
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                      placeholder="1312345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Género *
                  </label>
                  <select
                    value={genero}
                    onChange={(e) => setGenero(e.target.value as 'masculino' | 'femenino')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                  >
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Fecha de Nacimiento *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      value={fechaNacimiento}
                      onChange={(e) => setFechaNacimiento(e.target.value)}
                      required
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  {edad !== null && (
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Edad calculada: <span className="text-orange-600 font-bold">{edad} años</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Teléfono (10 dígitos)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={10}
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono"
                      placeholder="0987654321"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="jugador@ejemplo.com"
                  />
                </div>
              </div>
            </form>
          )}

          {activeTab === 'documentos' && (
            <div className="space-y-6">
              {/* Foto de Perfil */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-orange-500 shrink-0 flex items-center justify-center">
                    {currentJugador.url_foto ? (
                      <img
                        src={currentJugador.url_foto}
                        alt={currentJugador.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Foto de Perfil</h4>
                    <p className="text-xs text-slate-500">
                      Formatos JPG, PNG, WebP (Máx. 4 MB)
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                        currentJugador.url_foto
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {currentJugador.url_foto ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {currentJugador.url_foto ? 'Foto Cargada' : 'Sin Foto'}
                    </span>
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fotoInputRef}
                    onChange={handleUploadFoto}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingFoto}
                    onClick={() => fotoInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {uploadingFoto ? (
                      <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                    ) : (
                      <Camera className="w-4 h-4 text-orange-600" />
                    )}
                    {currentJugador.url_foto ? 'Cambiar Foto' : 'Subir Foto'}
                  </button>
                </div>
              </div>

              {/* Documento Cédula */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Cédula de Identidad</h4>
                    <p className="text-xs text-slate-500">PDF, JPG o PNG (Máx. 4 MB)</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          currentJugador.url_cedula
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {currentJugador.url_cedula ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {currentJugador.url_cedula ? 'Documento Subido' : 'Pendiente'}
                      </span>
                      {currentJugador.url_cedula && (
                        <a
                          href={currentJugador.url_cedula}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver Cédula
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    ref={cedulaInputRef}
                    onChange={handleUploadCedula}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingCedula}
                    onClick={() => cedulaInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {uploadingCedula ? (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-blue-600" />
                    )}
                    {currentJugador.url_cedula ? 'Reemplazar Cédula' : 'Subir Cédula'}
                  </button>
                </div>
              </div>

              {/* Acta de Bachiller */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Acta de Grado / Título</h4>
                    <p className="text-xs text-slate-500">PDF, JPG o PNG (Máx. 4 MB)</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          currentJugador.url_acta_bachiller
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {currentJugador.url_acta_bachiller ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {currentJugador.url_acta_bachiller ? 'Acta Subida' : 'No Registrada'}
                      </span>
                      {currentJugador.url_acta_bachiller && (
                        <a
                          href={currentJugador.url_acta_bachiller}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver Acta
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    ref={actaInputRef}
                    onChange={handleUploadActa}
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingActa}
                    onClick={() => actaInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                  >
                    {uploadingActa ? (
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-purple-600" />
                    )}
                    {currentJugador.url_acta_bachiller ? 'Reemplazar Acta' : 'Subir Acta'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'estado' && (
            <div className="space-y-6">
              {/* Selector de Estado */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Estado en la Plataforma
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEstado('activo')}
                    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      estado === 'activo'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle2 className={`w-5 h-5 ${estado === 'activo' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <p className="text-sm font-bold">Activo</p>
                      <p className="text-xs text-slate-500">Habilitado para jugar</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEstado('inactivo')}
                    className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      estado === 'inactivo'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <ShieldAlert className={`w-5 h-5 ${estado === 'inactivo' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <p className="text-sm font-bold">Inactivo</p>
                      <p className="text-xs text-slate-500">Deshabilitado</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Plantillas y Participaciones */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Equipos y Torneos Asignados
                </h4>

                {currentJugador.plantillas && currentJugador.plantillas.length > 0 ? (
                  <div className="space-y-2">
                    {currentJugador.plantillas.map((p) => (
                      <div
                        key={p.id_plantilla}
                        className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{p.nombre_equipo || 'Equipo'}</span>
                          <span className="text-slate-400 mx-1.5">•</span>
                          <span className="text-slate-600">{p.nombre_torneo || 'Torneo'}</span>
                        </div>
                        {p.numero_camiseta !== null && p.numero_camiseta !== undefined && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-bold">
                            #{p.numero_camiseta}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Este jugador no tiene asignaciones activas en ningún equipo o torneo en este momento.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSubmitDatos}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-bold shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
