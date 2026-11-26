// Estado inicial de la app: sin expedientes con datos. Los aranceles son la tabla pública base.
window.SEED = {
  "version": 2,
  "tema": "claro",
  "usuario_actual": "u1",
  "usuarios": [
    {
      "id": "u1",
      "nombre": "Usuario",
      "apellido": "",
      "puesto": "",
      "departamento": "",
      "correo": "",
      "telefono": "",
      "rol": "Contabilidad",
      "saludo": "Bienvenido"
    }
  ],
  "aranceles": [
    {
      "codigo": "8512.10.00.00",
      "descripcion": "Aparatos de alumbrado o señalización visual (bicicletas)",
      "dai": 0
    },
    {
      "codigo": "8512.20.00.00",
      "descripcion": "Los demás aparatos de alumbrado o señalización visual",
      "dai": 0
    },
    {
      "codigo": "8512.30.00.00",
      "descripcion": "Aparatos de señalización acústica",
      "dai": 0
    }
  ],
  "expedientes": [
    {
      "id": "guia-nueva",
      "guia": "",
      "titulo": "",
      "ruta": "",
      "tc_modo": "auto",
      "tipo_cambio": 0,
      "tc_fijo": 0,
      "dai_modo": "factura",
      "partida": "",
      "dai_pct": 0,
      "vinculo_banco_confirmado": false,
      "revision": {
        "estado": "Pendiente",
        "por": "",
        "fecha": ""
      },
      "contabilidad": {
        "cuentas": {
          "inventario": "",
          "iva": "",
          "proveedores": "",
          "bancos": "",
          "paypal": ""
        }
      },
      "documentos": {
        "ebay": {
          "pedido": "",
          "fecha": "",
          "item_id": "",
          "vendedor": "",
          "descripcion": "",
          "parte": "",
          "guia_nota": "",
          "subtotal": 0,
          "envio": 0,
          "impuesto": 0,
          "descuento": 0,
          "total_documento": 0
        },
        "tacsa": {
          "serie": "",
          "numero": "",
          "fecha": "",
          "cliente": "",
          "guia": "",
          "fecha_guia": "",
          "bultos": 0,
          "peso": 0,
          "cargos": [],
          "total_factura": 0,
          "cuenta_ajena": {
            "concepto": "",
            "documento_oea": "",
            "fecha_documento": "",
            "cif": 0,
            "dai": 0,
            "iva_dai": 0
          },
          "total_cobro": 0,
          "credito_dias": 0,
          "autorizacion": ""
        },
        "makan": {
          "numero": "",
          "fecha": "",
          "factura": "",
          "monto": 0,
          "proveedor": ""
        },
        "banco": {
          "numero": "",
          "fecha": "",
          "hora": "",
          "monto": 0,
          "cuenta": "",
          "descripcion": "",
          "referencia": "",
          "titular": ""
        }
      },
      "notas": []
    }
  ]
};
